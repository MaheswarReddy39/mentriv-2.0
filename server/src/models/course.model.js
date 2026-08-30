import mongoose from 'mongoose';

const LEVELS = ['basic', 'intermediate', 'advanced'];
const STATUSES = ['draft', 'published', 'archived'];
const IMAGE_MAX_LENGTH = 2_500_000;

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const normalizeSlug = (value) =>
  String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxLength: [150, 'Title cannot exceed 150 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      set: normalizeSlug,
      match: [SLUG_REGEX, 'Slug must be normalized kebab-case (lowercase letters, numbers, hyphens)'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxLength: [5000, 'Description cannot exceed 5000 characters'],
    },
    shortDescription: {
      type: String,
      trim: true,
      default: '',
      maxLength: [300, 'Short description cannot exceed 300 characters'],
    },
    thumbnail: {
      type: String,
      trim: true,
      default: '',
      maxLength: [IMAGE_MAX_LENGTH, 'Course image is too large'],
    },
    demoVideoThumbnail: {
      type: String,
      trim: true,
      default: '',
      maxLength: [IMAGE_MAX_LENGTH, 'Demo video thumbnail is too large'],
    },
    demoVideoUrl: {
      type: String,
      trim: true,
      default: '',
      maxLength: [2048, 'Demo video URL cannot exceed 2048 characters'],
    },
    price: {
      type: Number,
      default: 0,
      min: [0, 'Price cannot be negative'],
    },
    duration: {
      type: Number,
      default: 0,
      min: [0, 'Duration cannot be negative'],
    },
    level: {
      type: String,
      enum: { values: LEVELS, message: 'Level must be one of: basic, intermediate, advanced' },
      default: 'basic',
    },
    category: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      maxLength: [80, 'Category cannot exceed 80 characters'],
      index: true,
    },
    status: {
      type: String,
      enum: { values: STATUSES, message: 'Status must be one of: draft, published, archived' },
      default: 'draft',
    },
    curriculum: [
      {
        _id: false,
        title: {
          type: String,
          required: [true, 'Curriculum module title is required'],
          trim: true,
          maxLength: [200, 'Module title cannot exceed 200 characters'],
        },
        topics: [{ type: String, trim: true, maxLength: 200 }],
      },
    ],
    projects: [
      {
        _id: false,
        title: {
          type: String,
          required: [true, 'Project title is required'],
          trim: true,
          maxLength: [200, 'Project title cannot exceed 200 characters'],
        },
        description: {
          type: String,
          trim: true,
          default: '',
          maxLength: [1000, 'Project description cannot exceed 1000 characters'],
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

courseSchema.index({ status: 1, category: 1 });
courseSchema.index({ status: 1, level: 1 });

const Course = mongoose.model('Course', courseSchema);

export default Course;
