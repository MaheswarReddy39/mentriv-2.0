import mongoose from 'mongoose';
import Payment from '../models/payment.model.js';
import Enrollment from '../models/enrollment.model.js';
import ApiError from '../utils/api-error.js';
import notificationService from './notification.service.js';
import emailNotifications from './email-notification.service.js';
import { isTransitionAllowed } from './enrollment.service.js';

const sanitizePayment = (payment, { includeUser = false } = {}) => {
  const courseDoc = payment.courseId ?? {};
  const enrollmentDoc = payment.enrollmentId ?? {};
  const userDoc = payment.userId ?? {};

  const payload = {
    id: payment._id.toString(),
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    paymentMethod: payment.paymentMethod,
    transactionId: payment.transactionId,
    screenshotUrl: payment.screenshotUrl,
    rejectionReason: payment.rejectionReason,
    submittedAt: payment.submittedAt,
    verifiedAt: payment.verifiedAt,
    verifiedBy: payment.verifiedBy ? payment.verifiedBy.toString() : null,
  };

  if (enrollmentDoc._id) {
    payload.enrollment = {
      id: enrollmentDoc._id.toString(),
      status: enrollmentDoc.status,
    };
  }

  if (courseDoc._id) {
    payload.course = {
      id: courseDoc._id.toString(),
      title: courseDoc.title,
      slug: courseDoc.slug,
    };
  }

  if (includeUser && userDoc._id) {
    payload.user = {
      id: userDoc._id.toString(),
      name: userDoc.name,
      email: userDoc.email,
    };
  }

  return payload;
};

const submitPayment = async (
  userId,
  { enrollmentId, transactionId, screenshotUrl, currency, paymentMethod }
) => {
  if (!mongoose.isValidObjectId(enrollmentId)) {
    throw new ApiError(404, 'Enrollment not found');
  }

  const enrollment = await Enrollment.findOne({ _id: enrollmentId }).populate(
    'courseId',
    'title slug price status'
  );

  if (!enrollment || enrollment.userId.toString() !== userId) {
    throw new ApiError(404, 'Enrollment not found');
  }

  const course = enrollment.courseId;
  if (!course || course.status !== 'published') {
    throw new ApiError(404, 'Course not found');
  }

  if (enrollment.status !== 'pending') {
    throw new ApiError(409, 'This enrollment is not eligible for a new payment submission');
  }

  const duplicatePending = await Payment.exists({
    enrollmentId: enrollmentId,
    status: 'pending',
  });
  if (duplicatePending) {
    throw new ApiError(409, 'A pending payment already exists for this enrollment');
  }

  let payment;
  try {
    payment = await Payment.create({
      userId,
      enrollmentId,
      courseId: course._id,
      amount: course.price,
      currency: currency || 'INR',
      paymentMethod: paymentMethod || 'upi',
      transactionId: transactionId ?? '',
      screenshotUrl: screenshotUrl ?? '',
      status: 'pending',
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, 'A conflicting payment record already exists');
    }
    throw error;
  }

  await payment.populate('courseId', 'title slug');

  return { payment: sanitizePayment(payment) };
};

const getMyPayments = async (userId, { page = 1, limit = 10, status }) => {
  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  const filter = { userId };
  if (status) {
    filter.status = status;
  }

  const [total, documents] = await Promise.all([
    Payment.countDocuments(filter),
    Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .populate('courseId', 'title slug')
      .populate('enrollmentId', 'status')
      .lean(),
  ]);

  return {
    payments: documents.map((doc) => sanitizePayment(doc)),
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      totalItems: total,
      totalPages: Math.ceil(total / limitNumber),
      hasNextPage: pageNumber * limitNumber < total,
    },
  };
};

const getPaymentById = async (requester, id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(404, 'Payment not found');
  }

  const isAdmin = requester.role === 'admin' || requester.role === 'superAdmin';

  const query = Payment.findById(id).populate('courseId', 'title slug').populate(
    'enrollmentId',
    'status'
  );

  if (isAdmin) {
    query.populate('userId', 'name email');
  }

  const payment = await query;

  if (!payment) {
    throw new ApiError(404, 'Payment not found');
  }

  if (!isAdmin && payment.userId.toString() !== requester.id) {
    throw new ApiError(404, 'Payment not found');
  }

  return { payment: sanitizePayment(payment, { includeUser: isAdmin }) };
};

const listPayments = async ({ page = 1, limit = 10, status, courseId, enrollmentId }) => {
  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  const filter = {};
  if (status) {
    filter.status = status;
  }
  if (courseId) {
    filter.courseId = courseId;
  }
  if (enrollmentId) {
    filter.enrollmentId = enrollmentId;
  }

  const [total, documents] = await Promise.all([
    Payment.countDocuments(filter),
    Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .populate('courseId', 'title slug price')
      .populate('enrollmentId', 'status')
      .populate('userId', 'name email')
      .lean(),
  ]);

  return {
    payments: documents.map((doc) => sanitizePayment(doc, { includeUser: Boolean(doc.userId) })),
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      totalItems: total,
      totalPages: Math.ceil(total / limitNumber),
      hasNextPage: pageNumber * limitNumber < total,
    },
  };
};

const updatePaymentStatus = async (adminUserId, id, targetStatus, rejectionReason) => {
  if (targetStatus === 'pending') {
    throw new ApiError(400, 'Payments cannot be moved back to pending');
  }
  if (!['verified', 'rejected'].includes(targetStatus)) {
    throw new ApiError(400, 'Invalid payment status');
  }
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(404, 'Payment not found');
  }
  if (
    targetStatus === 'rejected' &&
    (!rejectionReason || rejectionReason.trim().length < 5)
  ) {
    throw new ApiError(400, 'A meaningful rejection reason is required');
  }

  const session = await mongoose.startSession();

  try {
    let resultPayment;

    await session.withTransaction(async () => {
      const payment = await Payment.findById(id).session(session);

      if (!payment) {
        throw new ApiError(404, 'Payment not found');
      }
      if (payment.status !== 'pending') {
        throw new ApiError(409, 'Payment has already been processed');
      }

      if (targetStatus === 'verified') {
        const enrollment = await Enrollment.findById(payment.enrollmentId).session(session);

        if (!enrollment) {
          throw new ApiError(404, 'Enrollment not found');
        }
        if (!isTransitionAllowed(enrollment.status, 'approved')) {
          throw new ApiError(400, 'Enrollment is not eligible for approval');
        }

        enrollment.status = 'approved';
        enrollment.approvedAt = new Date();
        await enrollment.save({ session });
      }

      payment.status = targetStatus;
      payment.verifiedBy = adminUserId;
      payment.verifiedAt = new Date();
      if (targetStatus === 'rejected') {
        payment.rejectionReason = rejectionReason.trim();
      }

      await payment.save({ session });
      resultPayment = payment;
    });

    await resultPayment.populate([
      { path: 'courseId', select: 'title slug' },
      { path: 'enrollmentId', select: 'status' },
    ]);

    // Event integration: notify the student on verified/rejected transitions only.
    await notificationService.notifyPaymentStatusChange(resultPayment, targetStatus);

    // Email delivery happens AFTER the transaction commits and is failure-safe.
    await emailNotifications.sendPaymentStatusEmails(resultPayment, targetStatus);

    return { payment: sanitizePayment(resultPayment) };
  } finally {
    session.endSession();
  }
};

export default {
  submitPayment,
  getMyPayments,
  getPaymentById,
  listPayments,
  updatePaymentStatus,
};
