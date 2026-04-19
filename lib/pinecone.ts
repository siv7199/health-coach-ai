import { Pinecone } from '@pinecone-database/pinecone';
import { PINECONE_TOP_K } from '@/config';
import { searchResultsToChunks, getSourcesFromChunks, getContextFromSources } from '@/lib/sources';
import { PINECONE_INDEX_NAME } from '@/config';

function getPineconeIndex() {
    const apiKey = process.env.PINECONE_API_KEY;
    const host = process.env.PINECONE_INDEX_HOST;
    
    if (!apiKey || !host) {
        return null;
    }

    try {
        const pinecone = new Pinecone({
            apiKey,
        });

        return pinecone.Index(PINECONE_INDEX_NAME, host);
    } catch (error) {
        console.warn('Failed to initialize Pinecone:', error);
        return null;
    }
}

export async function searchPinecone(
    query: string,
): Promise<string> {
    try {
        const pineconeIndex = getPineconeIndex();
        
        if (!pineconeIndex) {
            return '< results > Knowledge base not configured. </results>';
        }

        const results = await pineconeIndex.namespace('default').searchRecords({
            query: {
                inputs: {
                    text: query,
                },
                topK: PINECONE_TOP_K,
            },
            fields: ['text', 'pre_context', 'post_context', 'source_url', 'source_description', 'source_type', 'order'],
        });

        if (!results || !results.result?.hits || results.result.hits.length === 0) {
            return '< results > No knowledge base content found. </results>';
        }

        const chunks = searchResultsToChunks(results);
        const sources = getSourcesFromChunks(chunks);
        const context = getContextFromSources(sources);
        return `< results > ${context} </results>`;
    } catch (error) {
        console.warn('Pinecone search failed:', error);
        return '< results > Knowledge base temporarily unavailable. </results>';
    }
}