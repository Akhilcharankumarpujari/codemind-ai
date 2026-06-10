import User from '../models/User.js';

export async function getUserByEmail(email) {
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    return user ? user.toObject() : null;
  } catch (err) {
    console.error('Error finding user in MongoDB:', err.message);
    return null;
  }
}

export async function createUser(userData) {
  try {
    const user = new User(userData);
    await user.save();
    return user.toObject();
  } catch (err) {
    console.error('Error creating user in MongoDB:', err.message);
    throw err;
  }
}
