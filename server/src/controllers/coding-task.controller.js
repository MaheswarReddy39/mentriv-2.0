import asyncHandler from '../utils/async-handler.js';
import codingTaskService from '../services/coding-task.service.js';

const listTasks = asyncHandler(async (req, res) => {
  const result = await codingTaskService.listCodingTasks(req.user, {
    courseId: req.query.courseId,
    level: req.query.level,
    topic: req.query.topic,
  });

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const listGroups = asyncHandler(async (req, res) => {
  const result = await codingTaskService.listCodingTaskGroups(req.user);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const getTask = asyncHandler(async (req, res) => {
  const { codingTask } = await codingTaskService.getCodingTask(req.user, req.params.id);

  res.status(200).json({
    status: 'success',
    data: { codingTask },
  });
});

const createTask = asyncHandler(async (req, res) => {
  const { codingTask } = await codingTaskService.createCodingTask(
    req.user,
    req.params.courseId,
    req.body
  );

  res.status(201).json({
    status: 'success',
    message: 'Coding task created successfully',
    data: { codingTask },
  });
});

const createTasksForCourses = asyncHandler(async (req, res) => {
  const { codingTasks, courseIds } = await codingTaskService.createCodingTasksForCourses(
    req.user,
    req.body.courseIds,
    req.body
  );

  res.status(201).json({
    status: 'success',
    message: `Coding task created for ${codingTasks.length} course${
      codingTasks.length === 1 ? '' : 's'
    }`,
    data: { codingTasks, courseIds },
  });
});

const updateTask = asyncHandler(async (req, res) => {
  const { codingTask } = await codingTaskService.updateCodingTask(req.user, req.params.id, req.body);

  res.status(200).json({
    status: 'success',
    message: 'Coding task updated successfully',
    data: { codingTask },
  });
});

const listSubmissions = asyncHandler(async (req, res) => {
  const result = await codingTaskService.listCodingSubmissions(
    req.user,
    req.params.id,
    req.query.courseId
  );

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const createSubmission = asyncHandler(async (req, res) => {
  const { submission } = await codingTaskService.createCodingSubmission(
    req.user,
    req.params.id,
    req.body
  );

  res.status(201).json({
    status: 'success',
    message: 'Submission recorded successfully',
    data: { submission },
  });
});

export {
  listTasks,
  listGroups,
  getTask,
  createTask,
  createTasksForCourses,
  updateTask,
  listSubmissions,
  createSubmission,
};
