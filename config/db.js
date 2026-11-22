const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/aspire_mediatech';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000 // Quick timeout if MongoDB is offline locally
    });
    console.log(`=======================================================`);
    console.log(` MongoDB Connected Successfully!`);
    console.log(` Host: ${conn.connection.host}`);
    console.log(` Database: ${conn.connection.name}`);
    console.log(` URI: ${uri}`);
    console.log(`=======================================================`);
    return true;
  } catch (error) {
    console.warn(`=======================================================`);
    console.warn(` MongoDB Connection Warning:`);
    console.warn(` ${error.message}`);
    console.warn(` Falling back to local file storage until MongoDB is online.`);
    console.warn(` For hosting, set MONGODB_URI in your cloud environment.`);
    console.warn(`=======================================================`);
    return false;
  }
};

module.exports = connectDB;

