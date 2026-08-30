const getHealth = (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Mentriv 2.0 server is running',
  });
};

export default getHealth;
