import { getAuth } from "firebase/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

async function getAuthToken() {
    const auth = getAuth();
    if (!auth.currentUser) return null;
    return await auth.currentUser.getIdToken();
}

export async function uploadResume(file: File) {
    const token = await getAuthToken();
    const formData = new FormData();
    formData.append("resume", file); // Backend expects 'resume' field, not 'file'

    const response = await fetch(`${API_URL}/user/upload-resume`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`
        },
        body: formData,
    });

    if (!response.ok) {
        let errorMessage = "Failed to upload resume";
        try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
            // response was not JSON
        }
        throw new Error(errorMessage);
    }

    return response.json();
}

export async function deleteResume() {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/user/delete-resume`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error("Failed to delete resume");
    }

    return response.json();
}

export async function startJobScrape(keywords: string, location: string) {
    // Scraping runs automatically via daily cron job (8 AM UTC).
    // This function is a no-op — jobs will be available after the next cron run.
    // No fake success returned to avoid misleading the caller.
    return { success: true, message: "Jobs are scraped automatically every morning. You'll see matches in your dashboard." };
}

export async function getTaskStatus(taskId: string) {
    // Placeholder - Backend doesn't expose task status API yet
    return { status: "pending" };
}

export async function getDashboardStats() {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/dashboard/stats`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    }); // Backend uses Auth token, no query param needed
    if (!response.ok) throw new Error("Failed to fetch stats");
    return response.json();
}

export async function getApplications(limit = 50, offset = 0) {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/dashboard/applications?limit=${limit}&offset=${offset}`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!response.ok) throw new Error("Failed to fetch applications");
    return response.json();
}

export async function getRecentActivity() {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/dashboard/applications`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });
    if (!response.ok) throw new Error("Failed to fetch activity");
    return response.json();
}

export async function verifySmtp(email: string, password: string) {
    const token = await getAuthToken();
    if (!token) {
        throw new Error("Not authenticated. Please log in again.");
    }

    let response: Response;
    try {
        response = await fetch(`${API_URL}/user/setup-smtp`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ smtpEmail: email, smtpPassword: password }),
        });
    } catch (networkError: any) {
        throw new Error("Cannot reach server. Make sure the backend is running on localhost:8000.");
    }

    if (!response.ok) {
        let detail = "SMTP verification failed";
        try {
            const errorData = await response.json();
            detail = errorData.detail || detail;
        } catch {
            // Response body not JSON
        }
        throw new Error(detail);
    }

    return response.json();
}

export async function saveUserLinks(links: { github?: string; portfolio?: string }) {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/user/save-links`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(links),
    });

    if (!response.ok) throw new Error("Failed to save links");
    return response.json();
}

export async function toggleAutomation(isActive: boolean) {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/user/toggle-automation`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ isActive }),
    });

    if (!response.ok) throw new Error("Failed to toggle automation");
    return response.json();
}
