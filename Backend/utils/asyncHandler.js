const asyncHandler = (controllerFunction) => {

  const newFunction = (req, res, next) => {

    // Execute the original controller
    const result = controllerFunction(req, res, next);

    //  result is treated as a Promise
    const promise = Promise.resolve(result);

    // Function that handles an error
    const handleError = (error) => {
      next(error);
    };

    // If the Promise is rejected,
    // call handleError
    promise.catch(handleError);

  };

  // Return the new wrapped function
  return newFunction;
};

module.exports = asyncHandler;
