import asyncHandler from '../utils/async-handler.js';
import announcementService from '../services/announcement.service.js';

const listAnnouncements = asyncHandler(async (req, res) => {
  const result = await announcementService.listAnnouncements(
    req.user || null,
    req.query
  );

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const getAnnouncementById = asyncHandler(async (req, res) => {
  const { announcement } = await announcementService.getAnnouncementById(
    req.user || null,
    req.params.id
  );

  res.status(200).json({
    status: 'success',
    data: { announcement },
  });
});

const createAnnouncement = asyncHandler(async (req, res) => {
  const { announcement } = await announcementService.createAnnouncement(
    req.user,
    req.body
  );

  res.status(201).json({
    status: 'success',
    message: 'Announcement created successfully',
    data: { announcement },
  });
});

const updateAnnouncement = asyncHandler(async (req, res) => {
  const { announcement } = await announcementService.updateAnnouncement(
    req.user,
    req.params.id,
    req.body
  );

  res.status(200).json({
    status: 'success',
    message: 'Announcement updated successfully',
    data: { announcement },
  });
});

const archiveAnnouncement = asyncHandler(async (req, res) => {
  const { announcement } = await announcementService.archiveAnnouncement(req.params.id);

  res.status(200).json({
    status: 'success',
    message: 'Announcement archived successfully',
    data: { announcement },
  });
});

export {
  listAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  archiveAnnouncement,
};
