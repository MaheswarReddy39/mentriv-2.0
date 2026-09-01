const sendMessage = async ({ message }) => {
  return {
    reply: `Echo: ${message}`,
    timestamp: new Date().toISOString(),
  };
};

export default { sendMessage };
