import { auth } from '@/app/(auth)/auth';
import { getSuggestionsByDocumentId } from '@/lib/db/queries';
import { getCache, setCache } from '@/lib/upstash';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('documentId');

  if (!documentId) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Try to get suggestions from cache first
  const cacheKey = `suggestions:${documentId}`;
  const cachedSuggestions = await getCache<any[]>(cacheKey);
  
  let suggestions: any[] = [];
  
  if (cachedSuggestions) {
    suggestions = cachedSuggestions;
  } else {
    // Get from database if not cached
    suggestions = await getSuggestionsByDocumentId({
      documentId,
    });
  }

  const [suggestion] = suggestions;

  if (!suggestion) {
    return Response.json([], { status: 200 });
  }

  if (suggestion.userId !== session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Cache suggestions for 5 minutes if not already cached
  if (!cachedSuggestions) {
    await setCache(cacheKey, suggestions, 300);
  }

  return Response.json(suggestions, { status: 200 });
}
