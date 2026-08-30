import { validationResult } from 'express-validator';
import ApiError from '../utils/api-error.js';

const validate = (validations) => async (req, _res, next) => {
  await Promise.all(validations.map((validation) => validation.run(req)));

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ApiError(400, 'Validation failed', errors.array()));
  }

  return next();
};

export default validate;
