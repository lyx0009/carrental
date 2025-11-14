const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Cloud Function to set admin role
exports.setAdminRole = functions.https.onCall(async (data, context) => {
  // Verify the caller is an admin
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can set admin roles'
    );
  }

  const { userId } = data;
  
  try {
    // Set custom claim
    await admin.auth().setCustomUserClaims(userId, { admin: true });
    
    return { success: true, message: `User ${userId} is now an admin` };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});