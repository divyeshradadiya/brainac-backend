// Migration script to move user data from Firebase Auth custom claims to Firestore
// Run this script once to migrate existing users

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { COLLECTIONS, createUserDocument, createSubscriptionHistoryDocument } from '../types/firestore';

async function migrateUsersToFirestore() {
  console.log('🚀 Starting user data migration from Firebase Auth to Firestore...');

  try {
    // Initialize Firebase Admin (should already be initialized in main app)
    if (!admin.apps.length) {
      console.error('❌ Firebase Admin not initialized. Please ensure Firebase credentials are set.');
      return;
    }

    const db = getFirestore();

    // Get all users from Firebase Auth
    console.log('📋 Fetching users from Firebase Auth...');
    const listUsersResult = await admin.auth().listUsers();
    const users = listUsersResult.users;

    console.log(`👥 Found ${users.length} users to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const userRecord of users) {
      try {
        // Check if user already exists in Firestore
        const userDocRef = db.collection(COLLECTIONS.USERS).doc(userRecord.uid);
        const userDoc = await userDocRef.get();

        if (userDoc.exists) {
          console.log(`⏭️  User ${userRecord.uid} already exists in Firestore, skipping...`);
          skippedCount++;
          continue;
        }

        // Extract data from custom claims
        const customClaims = userRecord.customClaims || {};

        // Parse display name
        const nameParts = userRecord.displayName?.split(' ') || [];
        const firstName = customClaims.firstName || nameParts[0] || '';
        const lastName = customClaims.lastName || nameParts.slice(1).join(' ') || '';

        // Create user document
        const userData = createUserDocument({
          uid: userRecord.uid,
          email: userRecord.email!,
          firstName,
          lastName,
          class: customClaims.class || 5,
          subscriptionStatus: customClaims.subscriptionStatus || 'trial',
          subscriptionPlan: customClaims.subscriptionPlan,
          subscriptionStartDate: customClaims.subscriptionStartDate,
          subscriptionEndDate: customClaims.subscriptionEndDate,
          trialStartDate: customClaims.trialStartDate || new Date().toISOString(),
          trialEndDate: customClaims.trialEndDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        });

        // Save to Firestore
        await userDocRef.set(userData);

        // Create subscription history entry
        const subscriptionHistoryData = createSubscriptionHistoryDocument({
          userId: userRecord.uid,
          planId: customClaims.subscriptionPlan || 'monthly',
          status: customClaims.subscriptionStatus || 'trial',
          startDate: customClaims.subscriptionStartDate || customClaims.trialStartDate || new Date().toISOString(),
          endDate: customClaims.subscriptionEndDate || customClaims.trialEndDate,
        });

        await db.collection(COLLECTIONS.SUBSCRIPTION_HISTORY).add(subscriptionHistoryData);

        console.log(`✅ Migrated user ${userRecord.uid} (${userRecord.email})`);
        migratedCount++;

      } catch (error) {
        console.error(`❌ Failed to migrate user ${userRecord.uid}:`, error);
      }
    }

    console.log(`\n🎉 Migration completed!`);
    console.log(`📊 Summary:`);
    console.log(`   • Migrated: ${migratedCount} users`);
    console.log(`   • Skipped: ${skippedCount} users (already existed)`);
    console.log(`   • Total processed: ${users.length} users`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Export for use in scripts
export { migrateUsersToFirestore };

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateUsersToFirestore()
    .then(() => {
      console.log('🏁 Migration script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}