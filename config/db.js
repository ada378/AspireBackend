const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/aspire_mediatech';

  if (uri.includes('<db_password>') || uri.includes('<password>')) {
    console.warn(`=======================================================`);
    console.warn(` ⚠️ MONGODB_URI Warning:`);
    console.warn(` Connection string contains placeholder '<db_password>'.`);
    console.warn(` Please replace '<db_password>' with your actual MongoDB Atlas password in backend/.env!`);
    console.warn(` Falling back to local file storage until password is provided.`);
    console.warn(`=======================================================`);
    return false;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`=======================================================`);
    console.log(` MongoDB Connected Successfully!`);
    console.log(` Host: ${conn.connection.host}`);
    console.log(` Database: ${conn.connection.name}`);
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
