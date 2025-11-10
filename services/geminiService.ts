// This service now calls our own secure backend API route instead of Google's API directly.
export async function generateReportSummary(descriptions: string[]): Promise<string> {
  try {
    const response = await fetch('/api/generate-summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ descriptions }),
    });

    if (!response.ok) {
        // Try to parse the error message from the backend, otherwise use a generic message.
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error?.message || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.summary || "Não foi possível obter um resumo.";
  } catch (error) {
    console.error("Error fetching summary from backend:", error);
    // Provide a user-friendly error message.
    return `Não foi possível gerar o resumo. Erro: ${error instanceof Error ? error.message : String(error)}`;
  }
}