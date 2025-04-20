// user-manager.js - Handles user data and profile management

import { 
    auth, 
    db, 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    serverTimestamp, 
    signOut
  } from '../firebaseConfig.js';
  
  export class UserManager {
    constructor() {
      this.currentUser = null;
      this.userData = null;
      this.healthMetrics = null;
      this.initialized = false;
      
      // Initialize on construction
      this.init();
    }
    
    async init() {
      // Check if auth is initialized
      if (!auth) {
        console.error('Auth not initialized');
        return;
      }
      
      // Set up auth state listener
      auth.onAuthStateChanged(async (user) => {
        if (user) {
          this.currentUser = user;
          await this.loadUserData();
          
          // Dispatch event for other modules
          document.dispatchEvent(new CustomEvent('user:loaded', {
            detail: { user: this.currentUser, userData: this.userData }
          }));
        } else {
          this.currentUser = null;
          this.userData = null;
          this.healthMetrics = null;
        }
        
        this.initialized = true;
      });
    }
    
    async loadUserData() {
      if (!this.currentUser) return null;
      
      try {
        // Get user document
        const userDoc = await getDoc(doc(db, "users", this.currentUser.uid));
        
        if (userDoc.exists()) {
          this.userData = userDoc.data();
          
          // Load health metrics
          await this.loadHealthMetrics();
          
          return this.userData;
        } else {
          console.error('User document does not exist');
          return null;
        }
      } catch (error) {
        console.error("Error loading user data:", error);
        return null;
      }
    }
    
    async loadHealthMetrics() {
      if (!this.currentUser) return null;
      
      try {
        const metricsDoc = await getDoc(doc(db, "healthMetrics", this.currentUser.uid));
        
        if (metricsDoc.exists()) {
          this.healthMetrics = metricsDoc.data();
          return this.healthMetrics;
        } else {
          // Create default metrics if they don't exist
          const defaultMetrics = {
            heartRate: { value: null, timestamp: null, unit: 'bpm' },
            vision: { value: null, timestamp: null },
            hearing: { value: null, timestamp: null },
            createdAt: serverTimestamp(),
          };
          
          await setDoc(doc(db, "healthMetrics", this.currentUser.uid), defaultMetrics);
          this.healthMetrics = defaultMetrics;
          return defaultMetrics;
        }
      } catch (error) {
        console.error("Error loading health metrics:", error);
        return null;
      }
    }
    
    isAuthenticated() {
      return !!this.currentUser;
    }
    
    getCurrentUser() {
      // Format user data for the app
      if (!this.currentUser || !this.userData) return null;
      
      return {
        id: this.currentUser.uid,
        email: this.currentUser.email,
        name: this.userData.name || 'User',
        avatar: this.userData.avatar || 'assets/images/placeholder-avatar.jpg',
        dob: this.userData.dob || null,
        gender: this.userData.gender || null
      };
    }
    
    getHealthMetrics() {
      return this.healthMetrics;
    }
    
    async updateUserProfile(profileData) {
      if (!this.currentUser) return false;
      
      try {
        const userRef = doc(db, "users", this.currentUser.uid);
        
        await updateDoc(userRef, {
          ...profileData,
          profileSetup: true,
          updatedAt: serverTimestamp()
        });
        
        // Reload user data
        await this.loadUserData();
        
        return true;
      } catch (error) {
        console.error("Error updating profile:", error);
        return false;
      }
    }
    
    async updateHealthMetric(metricName, value, unit = null) {
      if (!this.currentUser) return false;
      
      try {
        const metricsRef = doc(db, "healthMetrics", this.currentUser.uid);
        
        const updateData = {};
        updateData[metricName] = {
          value,
          timestamp: serverTimestamp(),
          ...(unit ? { unit } : {})
        };
        
        await updateDoc(metricsRef, updateData);
        
        // Reload health metrics
        await this.loadHealthMetrics();
        
        return true;
      } catch (error) {
        console.error(`Error updating ${metricName}:`, error);
        return false;
      }
    }
    
    async addActivityRecord(activityType, detail, results = null) {
      if (!this.currentUser) return false;
      
      try {
        const activityRef = doc(db, "userActivity", this.currentUser.uid);
        
        // Get the current activity document
        const activityDoc = await getDoc(activityRef);
        
        // Create activity record
        const activityRecord = {
          type: activityType,
          detail,
          results,
          timestamp: new Date().toISOString()
        };
        
        if (activityDoc.exists()) {
          // Append to existing activities array
          const activities = activityDoc.data().activities || [];
          activities.unshift(activityRecord); // Add to beginning of array
          
          // Limit array to 50 items
          const limitedActivities = activities.slice(0, 50);
          
          await updateDoc(activityRef, {
            activities: limitedActivities,
            lastUpdated: serverTimestamp()
          });
        } else {
          // Create new activity document
          await setDoc(activityRef, {
            activities: [activityRecord],
            lastUpdated: serverTimestamp()
          });
        }
        
        return true;
      } catch (error) {
        console.error("Error adding activity record:", error);
        return false;
      }
    }
    
    async getActivityHistory(limit = 10) {
      if (!this.currentUser) return [];
      
      try {
        const activityDoc = await getDoc(doc(db, "userActivity", this.currentUser.uid));
        
        if (activityDoc.exists()) {
          const activities = activityDoc.data().activities || [];
          return activities.slice(0, limit);
        }
        
        return [];
      } catch (error) {
        console.error("Error getting activity history:", error);
        return [];
      }
    }
    
    async logout() {
      try {
        await signOut(auth);
        window.location.href = 'signinup.html';
        return true;
      } catch (error) {
        console.error("Error signing out:", error);
        return false;
      }
    }
  }