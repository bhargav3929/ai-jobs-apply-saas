"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from "react";
import {
    User,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    sendPasswordResetEmail,
    verifyPasswordResetCode,
    confirmPasswordReset,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { User as UserProfile } from "@/types/firestore";

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, name: string) => Promise<void>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    verifyResetCode: (code: string) => Promise<string>;
    confirmReset: (code: string, newPassword: string) => Promise<void>;
    refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Skip if Firebase is not configured
        if (!auth) {
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser && db) {
                // Fetch user profile from Firestore with timeout
                try {
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error("Timeout")), 5000); // 5s timeout for profile fetch
                    });

                    const userDoc = await Promise.race([
                        getDoc(doc(db, "users", firebaseUser.uid)),
                        timeoutPromise
                    ]) as any; // Cast to any because Promise.race type inference is tricky here

                    if (userDoc && userDoc.exists()) {
                        setUserProfile(userDoc.data() as UserProfile);
                    }
                } catch (error) {
                    console.warn("AuthContext: Failed to fetch user profile (timeout or error)", error);
                    // Proceed without profile - better than hanging the app
                }
            } else {
                setUserProfile(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        if (!auth) {
            throw new Error("Authentication service is not configured. Please contact support.");
        }
        await signInWithEmailAndPassword(auth, email, password);
    };

    const signUp = async (email: string, password: string, name: string) => {
        if (!auth || !db) {
            throw new Error("Authentication service is not configured. Please contact support.");
        }

        try {
            const { user: newUser } = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

            // Create user profile in Firestore
            const newUserProfile: UserProfile = {
                uid: newUser.uid,
                email: email,
                name: name,
                resumeUrl: null,
                jobCategory: "Software Developer",
                smtpEmail: "",
                smtpPassword: "",
                smtpServer: "smtp.gmail.com",
                smtpPort: 465,
                isActive: false,
                onboardingCompleted: false,
                createdAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
                subscriptionStatus: "active",
                subscriptionEndsAt: new Date(
                    Date.now() + 30 * 24 * 60 * 60 * 1000
                ).toISOString(), // 30 days trial
            };

            // Optimistically set the user profile so the UI can proceed immediately
            setUserProfile(newUserProfile);

            // Attempt to save to Firestore in the background
            // We use a timeout to ensure we don't hang if this promise is awaited somewhere else, 
            // but primarily we want to allow the user to proceed even if this fails (e.g. DB missing).
            const saveProfileTask = async () => {
                try {
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error("Timeout")), 10000);
                    });

                    await Promise.race([
                        setDoc(doc(db!, "users", newUser.uid), newUserProfile),
                        timeoutPromise
                    ]);
                } catch (error) {
                    console.warn("AuthContext: Failed to save user profile to Firestore (non-critical)", error);
                    // We suppress the error here to allow the signup flow to complete.
                    // The user is authenticated and has a local profile state.
                }
            };

            // We await it here but with the error suppressed by the function above, 
            // so we don't block the UI if it fails/times out.
            await saveProfileTask();
        } catch (error) {
            console.error("AuthContext: signUp failed", error);
            throw error;
        }
    };

    const signOut = async () => {
        if (!auth) {
            setUser(null);
            setUserProfile(null);
            return;
        }
        await firebaseSignOut(auth);
        setUserProfile(null);
    };

    const resetPassword = async (email: string) => {
        if (!auth) {
            throw new Error("Authentication service is not configured.");
        }
        await sendPasswordResetEmail(auth, email);
    };

    const verifyResetCode = async (code: string) => {
        if (!auth) {
            throw new Error("Authentication service is not configured.");
        }
        return await verifyPasswordResetCode(auth, code);
    };

    const confirmReset = async (code: string, newPassword: string) => {
        if (!auth) {
            throw new Error("Authentication service is not configured.");
        }
        await confirmPasswordReset(auth, code, newPassword);
    };

    const refreshUserProfile = async () => {
        if (!user || !db) return;

        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                setUserProfile(userDoc.data() as UserProfile);
            }
        } catch (error) {
            console.error("AuthContext: Failed to refresh profile", error);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                userProfile,
                loading,
                signIn,
                signUp,
                signOut,
                resetPassword,
                verifyResetCode,
                confirmReset,
                refreshUserProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
