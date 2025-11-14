// create-admin-user.js (run this once to create admin)
import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

async function createAdminUser() {
  try {
    // Create user in Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      "admin@carrental.com", 
      "admin123" // Change this to a secure password
    );
    
    const user = userCredential.user;
    
    // Add admin role to Firestore
    await setDoc(doc(db, "users", user.uid), {
      email: "admin@carrental.com",
      role: "admin",
      createdAt: new Date(),
      name: "System Administrator"
    });
    
    console.log("Admin user created successfully!");
  } catch (error) {
    console.error("Error creating admin user:", error);
  }
}

createAdminUser();