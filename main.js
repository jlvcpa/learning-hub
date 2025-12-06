import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
// Removed all Firebase Auth imports
import { getFirestore, setLogLevel, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- MODULE IMPORTS (for the feature engines) ---
import { initSettings } from './settings/settingsEngine.js';
import { initActivities } from './activities/activitiesEngine.js';
import { initGenerator } from './generator/generatorEngine.js';
import { initAttendance } from './attendance/attendanceEngine.js';
import { initAccountingCycle } from './activities/accountingCycleEngine.js'; // NEW IMPORT


// --- FIREBASE GLOBAL SETUP ---
setLogLevel('Debug');
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Configuration explicitly provided by the user.
const firebaseConfig = {
    apiKey: "AIzaSyAgOsKAZWwExUzupxSNytsfOo9BOppF0ng",
    authDomain: "jlvcpa-quizzes.firebaseapp.com",
    projectId: "jlvcpa-quizzes",
    storageBucket: "jlvcpa-quizzes.appspot.com",
    messagingSenderId: "629158256557",
    appId: "1:629158256557:web:b3d1a424b32e28cd578b24"
};

// Firestore path for the public teachers collection
const TEACHERS_COLLECTION_PATH = () => 'teachers';
const TEACHER_SESSION_KEY = 'learning_hub_teacher';

// Global Firebase instances and state
let app, db, userId = null;
let currentTeacher = null; 
let isFirebaseInitialized = false; 

/**
 * Saves currentTeacher state to sessionStorage for simple persistence.
 */
function saveTeacherSession(teacherData) {
    sessionStorage.setItem(TEACHER_SESSION_KEY, JSON.stringify(teacherData));
}

/**
 * Loads teacher state from sessionStorage.
 */
function loadTeacherSession() {
    const sessionData = sessionStorage.getItem(TEACHER_SESSION_KEY);
    return sessionData ? JSON.parse(sessionData) : null;
}

/**
 * Clears teacher state from sessionStorage.
 */
function clearTeacherSession() {
    sessionStorage.removeItem(TEACHER_SESSION_KEY);
    currentTeacher = null;
    userId = null;
    window.userId = null;
}

/**
 * Updates the header UI with the current teacher's information.
 */
function updateHeaderUI() {
    if (currentTeacher) {
        document.getElementById('user-info').innerText = `ID: ${currentTeacher.idNumber}`;
        document.getElementById('teacher-name').innerText = `${currentTeacher.firstName} ${currentTeacher.lastName}`;
    } else {
        document.getElementById('user-info').innerText = `Not Signed In`;
        document.getElementById('teacher-name').innerText = `Guest User`;
    }
}

/**
 * Shows the login overlay and hides the main content.
 */
function showLoginScreen() {
    document.getElementById('login-overlay').classList.remove('hidden');
    document.getElementById('sidebar').classList.add('hidden');
    document.querySelector('main').classList.add('hidden');
}

/**
 * Hides the login overlay and shows the main dashboard content.
 */
function showDashboard() {
    document.getElementById('login-overlay').classList.add('hidden');
    document.getElementById('sidebar').classList.remove('hidden');
    document.querySelector('main').classList.remove('hidden');

    // Update UI based on current teacher state
    updateHeaderUI();
    // Set default view to dashboard
    switchTab('dashboard'); 
}

/**
 * Initializes Firebase and sets up global state. (No Auth required)
 */
async function initializeFirebaseAndAuth() {
    try {
        // Initialize Core Firebase Services
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        
        // Ensure shared data is available
        window.db = db;
        window.appId = appId;
        // window.auth is no longer set
        isFirebaseInitialized = true;

        console.log("Firebase Core Initialized.");

        // Check for existing session
        const session = loadTeacherSession();
        if (session) {
            currentTeacher = session;
            userId = session.idNumber;
            window.userId = userId;
            console.log("Session restored for teacher:", userId);
            showDashboard();
        } else {
            // No active session, force login screen
            showLoginScreen();
        }

    } catch (error) {
        // Check if initialization failed entirely
        console.error("Firebase Initialization Error:", error);
        document.getElementById('login-error').textContent = `Initialization Error: ${error.message}`;
        document.getElementById('login-error').classList.remove('hidden');
        showLoginScreen();
    }
}

/**
 * Handles sign-in initiated from the UI form using Firestore validation.
 */
window.teacherSignInFromUI = async function() {
    if (!isFirebaseInitialized || !db) {
        console.error("Firestore DB not initialized yet. Please wait.");
        document.getElementById('login-error').textContent = 'System initializing, please try again in a moment.';
        document.getElementById('login-error').classList.remove('hidden');
        return;
    }

    const idInput = document.getElementById('login-id');
    const passInput = document.getElementById('login-password');
    const errorBox = document.getElementById('login-error');
    const idNumber = idInput.value.trim();
    const passWord = passInput.value.trim();
    
    errorBox.classList.add('hidden');
    errorBox.textContent = '';

    if (!idNumber || !passWord) {
        errorBox.textContent = 'Please enter both ID Number and Password.';
        errorBox.classList.remove('hidden');
        return;
    }

    try {
        // FIX: TEACHERS_COLLECTION_PATH() no longer takes appId, as it's a root collection.
        const teachersPath = TEACHERS_COLLECTION_PATH(); 
        console.log(`Querying teacher data in collection: ${teachersPath}`);

        // 1. Query Firestore for the teacher document using idNumber
        const q = query(collection(db, teachersPath), 
                        where("idNumber", "==", idNumber));
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            errorBox.textContent = 'Login failed: Teacher not found. (Check console for query details)';
            errorBox.classList.remove('hidden');
            console.warn(`Teacher not found. No document found with idNumber == ${idNumber}.`);
            return;
        }

        let teacherData = null;
        querySnapshot.forEach(doc => {
            teacherData = doc.data();
            console.log(`Found teacher document: ${doc.id}`);
        });

        // 2. Validate Password
        // Note: The password in your screenshot is "14344230321" (string)
        if (teacherData.passWord !== passWord) {
            errorBox.textContent = 'Login failed: Invalid password.';
            errorBox.classList.remove('hidden');
            console.warn(`Invalid password provided for ID ${idNumber}.`);
            return;
        }

        // 3. Successful login - Update global state and session
        const newTeacher = {
            idNumber: teacherData.idNumber,
            firstName: teacherData.firstName,
            lastName: teacherData.lastName,
            profession: teacherData.profession 
        };
        
        currentTeacher = newTeacher;
        userId = teacherData.idNumber;
        window.userId = userId;
        saveTeacherSession(newTeacher);

        console.log("Teacher successfully logged in (using Firestore validation).", userId);
        
        // Hide login and show dashboard
        showDashboard();

    } catch (error) {
        console.error("Login attempt failed:", error);
        errorBox.textContent = `An unexpected error occurred during login.`;
        errorBox.classList.remove('hidden');
    }
}

/**
 * Handles teacher sign-out by clearing the session.
 */
window.teacherSignOut = function() {
    clearTeacherSession();
    console.log("Teacher signed out. Clearing session and showing login screen.");
    showLoginScreen();
}


/**
 * Toggles the sidebar collapsed state.
 */
window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const toggleIcon = document.getElementById('toggle-icon');
    
    sidebar.classList.toggle('collapsed');
    sidebar.classList.toggle('w-64'); 
    
    if (sidebar.classList.contains('collapsed')) {
        toggleIcon.classList.remove('fa-bars');
        toggleIcon.classList.add('fa-chevron-right');
    } else {
        toggleIcon.classList.remove('fa-chevron-right');
        toggleIcon.classList.add('fa-bars');
    }
};

/**
 * Switches the main content area tab and calls the corresponding module initializer.
 * @param {string} tabName 
 */
window.switchTab = function(tabName) {
    // 1. UI Tab Switching
    document.querySelectorAll('.content-section').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    document.getElementById(`section-${tabName}`).classList.remove('hidden');
    document.getElementById(`nav-${tabName}`).classList.add('active');

    // 2. Update Header Title
    const titles = {
        'dashboard': 'Dashboard Overview',
        'students': 'Student Management',
        'classes': 'Class Management',
        'attendance': 'Attendance Monitoring',
        'materials': 'Learning Materials',
        'activities': 'Activity Dashboard',
        'accounting_cycle': 'Accounting Cycle Creator', // NEW TITLE
        'grades': 'Grades',
        'settings': 'School Settings',
        'generator': 'Link Generator'
    };
    document.getElementById('page-title').innerText = titles[tabName];

    // 3. Dynamic Module Loading/Initialization
    // Call the respective module's initializer function only if Firebase is ready and user is logged in
    if (db && userId) {
        switch (tabName) {
            case 'settings':
                initSettings(db, userId, appId);
                break;
            case 'activities':
                initActivities(db, userId, appId);
                break;
            case 'accounting_cycle': // NEW CASE
                initAccountingCycle(db, userId, appId);
                break;
            case 'generator':
                initGenerator(db, userId, appId);
                break;
            case 'attendance': 
                initAttendance(db, userId, appId);
                break;
            default:
                // For placeholder sections (dashboard, students, etc.), no action needed
                break;
        }
    } else {
        console.warn("User not logged in or Firebase not ready. Cannot initialize module:", tabName);
    }
}

// Start the entire application flow on load
window.addEventListener('DOMContentLoaded', initializeFirebaseAndAuth);
