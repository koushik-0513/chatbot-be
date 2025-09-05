import { mg } from '../config/mg';

/**
 * Updates the total_articles count for a collection hierarchy
 * This function calculates and updates the count for the collection and all its parent collections
 */
export async function updateCollectionArticleCount(collectionId: any) {
    try {
        const collection = await mg.Collection.findById(collectionId);
        if (!collection) return;

        // Calculate total articles for this collection
        const totalArticles = await calculateCollectionArticleCount(collectionId);

        // Update this collection's count
        await mg.Collection.findByIdAndUpdate(collectionId, {
            total_articles: totalArticles
        });

        // If this collection has a parent, update parent counts recursively
        if (collection.parentCollection) {
            await updateCollectionArticleCount(collection.parentCollection);
        }
    } catch (error) {
        console.error('Error updating collection article count:', error);
    }
}

/**
 * Calculates the total number of articles in a collection hierarchy
 * Includes articles directly in the collection and all sub-collections
 */
async function calculateCollectionArticleCount(collectionId: any): Promise<number> {
    try {
        // Count articles directly in this collection
        const directArticles = await mg.Article.countDocuments({
            collection_id: collectionId,
            isPublished: true
        });

        // Find all sub-collections
        const subCollections = await mg.Collection.find({
            parentCollection: collectionId,
            isPublished: true
        }).select('_id');

        let subArticles = 0;

        // Recursively count articles in sub-collections
        for (const subCollection of subCollections) {
            subArticles += await calculateCollectionArticleCount(subCollection._id);
        }

        return directArticles + subArticles;
    } catch (error) {
        console.error('Error calculating collection article count:', error);
        return 0;
    }
}

/**
 * Initializes article counts for all collections
 * Use this function to populate the total_articles field for existing collections
 */
export async function initializeAllCollectionCounts() {
    try {
        console.log('🔄 Initializing article counts for all collections...');

        const collections = await mg.Collection.find({}).sort({ level: -1 }); // Start from deepest level

        for (const collection of collections) {
            const totalArticles = await calculateCollectionArticleCount(collection._id);
            await mg.Collection.findByIdAndUpdate(collection._id, {
                total_articles: totalArticles
            });
            console.log(`✅ Updated ${collection.title}: ${totalArticles} articles`);
        }

        console.log('🎉 All collection article counts initialized successfully!');
    } catch (error) {
        console.error('❌ Error initializing collection counts:', error);
    }
}
