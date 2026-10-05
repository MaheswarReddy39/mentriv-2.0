import mongoose from 'mongoose';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const TASK_TYPES = [
  'Coding Problem',
  'Frontend Task',
  'Backend / API Task',
  'React Task',
  'MERN Task',
];
const STATUSES = ['draft', 'published', 'archived'];
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const testCaseSchema = new mongoose.Schema(
  {
    input: {
      type: String,
      trim: true,
      default: '',
      maxLength: [5000, 'Test case input cannot exceed 5000 characters'],
    },
    expected: {
      type: String,
      trim: true,
      default: '',
      maxLength: [5000, 'Expected output cannot exceed 5000 characters'],
    },
  },
  { _id: false }
);

const apiTestCaseSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: {
        values: HTTP_METHODS,
        message: 'HTTP method must be one of: GET, POST, PUT, PATCH, DELETE',
      },
      default: 'GET',
    },
    endpoint: {
      type: String,
      trim: true,
      default: '',
      maxLength: [300, 'Endpoint cannot exceed 300 characters'],
    },
    expected: {
      type: String,
      trim: true,
      default: '',
      maxLength: [2000, 'Expected result cannot exceed 2000 characters'],
    },
  },
  { _id: false }
);

const codingTaskSchema = new mongoose.Schema(
  {
    // One document is shared by every course that can access it.
    courseIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Course',
      required: [true, 'Course reference is required'],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'At least one course is required',
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator reference is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxLength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxLength: [5000, 'Description cannot exceed 5000 characters'],
    },
    level: {
      type: String,
      enum: {
        values: LEVELS,
        message: 'Level must be one of: Beginner, Intermediate, Advanced',
      },
      required: [true, 'Level is required'],
    },
    topic: {
      type: String,
      required: [true, 'Topic is required'],
      trim: true,
      maxLength: [120, 'Topic cannot exceed 120 characters'],
    },
    taskType: {
      type: String,
      enum: {
        values: TASK_TYPES,
        message: 'Task type must be one of: Coding Problem, Frontend Task, Backend / API Task, React Task, MERN Task',
      },
      required: [true, 'Task type is required'],
    },
    difficulty: {
      type: String,
      enum: {
        values: DIFFICULTIES,
        message: 'Difficulty must be one of: Easy, Medium, Hard',
      },
      required: [true, 'Difficulty is required'],
    },
    status: {
      type: String,
      enum: {
        values: STATUSES,
        message: 'Status must be one of: draft, published, archived',
      },
      default: 'draft',
    },
    taskOrder: {
      type: Number,
      default: 0,
      min: [0, 'Task order cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Task order must be an integer',
      },
    },

    language: {
      type: String,
      trim: true,
      default: '',
      maxLength: [40, 'Language cannot exceed 40 characters'],
    },
    inputFormat: {
      type: String,
      trim: true,
      default: '',
      maxLength: [2000, 'Input format cannot exceed 2000 characters'],
    },
    outputFormat: {
      type: String,
      trim: true,
      default: '',
      maxLength: [2000, 'Output format cannot exceed 2000 characters'],
    },
    constraints: {
      type: String,
      trim: true,
      default: '',
      maxLength: [2000, 'Constraints cannot exceed 2000 characters'],
    },
    starterCode: {
      type: String,
      trim: true,
      default: '',
      maxLength: [10000, 'Starter code cannot exceed 10000 characters'],
    },
    sampleTestCases: {
      type: [testCaseSchema],
      default: [],
    },
    hiddenTestCases: {
      type: [testCaseSchema],
      default: [],
    },

    requirements: {
      type: String,
      trim: true,
      default: '',
      maxLength: [5000, 'Requirements cannot exceed 5000 characters'],
    },
    starterFiles: {
      type: String,
      trim: true,
      default: '',
      maxLength: [5000, 'Starter files cannot exceed 5000 characters'],
    },
    evaluationRequirements: {
      type: String,
      trim: true,
      default: '',
      maxLength: [5000, 'Evaluation requirements cannot exceed 5000 characters'],
    },

    apiRequirements: {
      type: String,
      trim: true,
      default: '',
      maxLength: [5000, 'API requirements cannot exceed 5000 characters'],
    },
    apiTestCases: {
      type: [apiTestCaseSchema],
      default: [],
    },

    frontendRequirements: {
      type: String,
      trim: true,
      default: '',
      maxLength: [5000, 'Frontend requirements cannot exceed 5000 characters'],
    },
    backendRequirements: {
      type: String,
      trim: true,
      default: '',
      maxLength: [5000, 'Backend requirements cannot exceed 5000 characters'],
    },
    databaseRequirements: {
      type: String,
      trim: true,
      default: '',
      maxLength: [5000, 'Database requirements cannot exceed 5000 characters'],
    },
  },
  {
    timestamps: true,
    collection: 'coding_tasks',
  }
);

codingTaskSchema.index({ createdBy: 1, createdAt: -1 });
codingTaskSchema.index({ courseIds: 1, status: 1 });
codingTaskSchema.index({ courseIds: 1, status: 1, level: 1, topic: 1, taskOrder: 1, createdAt: 1 });
codingTaskSchema.index({ createdBy: 1, courseIds: 1, level: 1, topic: 1, taskOrder: 1 });

const CodingTask = mongoose.model('CodingTask', codingTaskSchema);

export default CodingTask;
