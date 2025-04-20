// auth.js - Authentication implementation for HealthCompanion

import { 
    auth, 
    db, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    doc,
    setDoc,
    getDoc,
    serverTimestamp
  } from '../firebaseConfig.js';
  
  // DOM Elements
  const loginForm = document.getElementById('form-login');
  const signupForm = document.getElementById('form-signup');
  const loginFormContainer = document.getElementById('login-form');
  const signupFormContainer = document.getElementById('signup-form');
  const showSignupLink = document.getElementById('show-signup');
  const showLoginLink = document.getElementById('show-login');
  
  // Function to show toast messages
  function showToast(message, isError = false) {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      Object.assign(toastContainer.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '1000',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      });
      document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = isError ? 'toast toast-error' : 'toast';
    Object.assign(toast.style, {
      backgroundColor: isError ? '#fee2e2' : '#f0fdf4',
      color: isError ? '#b91c1c' : '#166534',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      minWidth: '300px',
      maxWidth: '400px',
      border: isError ? '1px solid #fca5a5' : '1px solid #86efac'
    });
    
    // Create message content
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    toast.appendChild(messageDiv);
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.fontSize = '20px';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.marginLeft = '10px';
    closeBtn.onclick = () => {
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentNode) {
          toastContainer.removeChild(toast);
        }
      }, 300);
    };
    toast.appendChild(closeBtn);
    
    // Add toast to container
    toastContainer.appendChild(toast);
    
    // Remove toast after 5 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      
      setTimeout(() => {
        if (toast.parentNode === toastContainer) {
          toastContainer.removeChild(toast);
          
          // Remove container if empty
          if (toastContainer.children.length === 0) {
            document.body.removeChild(toastContainer);
          }
        }
      }, 300);
    }, 5000);
  }
  
  // User registration function
  async function registerUser(email, password, userData) {
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Add additional user data to Firestore
      await setDoc(doc(db, "users", user.uid), {
        ...userData,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        email: email,
      });
      
      showToast('Account created successfully!');
      
      // Create initial health metrics
      await setDoc(doc(db, "healthMetrics", user.uid), {
        heartRate: { value: null, timestamp: null, unit: 'bpm' },
        vision: { value: null, timestamp: null },
        hearing: { value: null, timestamp: null },
        createdAt: serverTimestamp(),
      });
      
      // Create activity history collection
      await setDoc(doc(db, "userActivity", user.uid), {
        activities: [],
        lastUpdated: serverTimestamp()
      });
      
      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000);
      
      return user;
    } catch (error) {
      console.error("Error registering user:", error);
      let errorMessage = 'Failed to create account.';
      
      // Firebase specific error messages
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email is already in use.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak.';
      }
      
      showToast(errorMessage, true);
      throw error;
    }
  }
  
  // User login function
  async function loginUser(email, password) {
    try {
      // Sign in user
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update last login
      await updateUserLastLogin(user.uid);
      
      showToast('Login successful!');
      
      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000);
      
      return user;
    } catch (error) {
      console.error("Error logging in:", error);
      let errorMessage = 'Failed to log in.';
      
      // Firebase specific error messages
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later.';
      }
      
      showToast(errorMessage, true);
      throw error;
    }
  }
  
  // Update last login timestamp
  async function updateUserLastLogin(userId) {
    try {
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, {
        lastLogin: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error("Error updating last login:", error);
    }
  }
  
  // User logout function
  async function logoutUser() {
    try {
      await signOut(auth);
      window.location.href = 'login.html';
    } catch (error) {
      console.error("Error signing out:", error);
      showToast('Error signing out. Please try again.', true);
    }
  }
  
  // Check authentication status
  function checkAuthState() {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          // User is signed in
          resolve(user);
        } else {
          // User is signed out
          resolve(null);
        }
      });
    });
  }
  
  // Toggle between login and signup forms
  function setupFormToggle() {
    showSignupLink.addEventListener('click', (e) => {
      e.preventDefault();
      loginFormContainer.classList.add('hidden');
      signupFormContainer.classList.remove('hidden');
    });
    
    showLoginLink.addEventListener('click', (e) => {
      e.preventDefault();
      signupFormContainer.classList.add('hidden');
      loginFormContainer.classList.remove('hidden');
    });
  }
  
  // Setup form submissions
  function setupFormSubmissions() {
    // Signup Form
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('signup-email').value;
      const password = document.getElementById('signup-password').value;
      const name = document.getElementById('signup-name').value;
      const dob = document.getElementById('signup-dob').value;
      const gender = document.querySelector('input[name="gender"]:checked')?.value;
      const termsAccepted = document.getElementById('terms-checkbox').checked;
      
      if (!email || !password || !name || !dob || !gender || !termsAccepted) {
        showToast('Please fill out all fields and accept the terms.', true);
        return;
      }
      
      // Password validation
      if (password.length < 8) {
        showToast('Password must be at least 8 characters long.', true);
        return;
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showToast('Please enter a valid email address.', true);
        return;
      }
      
      // Create user data object
      const userData = {
        name,
        dob,
        gender,
        profileSetup: false,
        avatar: null
      };
      
      try {
        // Show loading state
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Account...';
        
        await registerUser(email, password, userData);
        
        // Reset form
        signupForm.reset();
      } catch (error) {
        console.error('Signup error:', error);
      } finally {
        // Reset button state
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
      }
    });
    
    // Login Form
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      
      if (!email || !password) {
        showToast('Please enter both email and password.', true);
        return;
      }
      
      try {
        // Show loading state
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing In...';
        
        await loginUser(email, password);
        
        // Reset form
        loginForm.reset();
      } catch (error) {
        console.error('Login error:', error);
      } finally {
        // Reset button state
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    });
  }
  
  // Initialize auth functionality
  async function initAuth() {
    setupFormToggle();
    setupFormSubmissions();
    
    // Check if user is already logged in
    const user = await checkAuthState();
    if (user) {
      window.location.href = 'dashboard.html';
    }
  }
  
  // Run initialization
  document.addEventListener('DOMContentLoaded', initAuth);
  
  // Export functions for use in other modules
  export {
    registerUser,
    loginUser,
    logoutUser,
    checkAuthState
  };