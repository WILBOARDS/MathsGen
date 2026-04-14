# Firestore RBAC Rules Validation & Deployment Guide

**Date**: April 7, 2026  
**Version**: 1.0  
**Status**: Ready to Deploy

---

## ✅ DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] Reviewed new RBAC rules in `firestore.rules`
- [ ] Backed up current Firestore data
- [ ] Tested against emulator locally
- [ ] Confirmed admin user has `admin: true` custom claim in Firebase Auth

### Deployment Steps

```bash
# 1. Validate syntax locally
firebase emulators:start --only firestore &
EMULATOR_PID=$!

# 2. Deploy rules
firebase deploy --only firestore:rules

# 3. Stop emulator
kill $EMULATOR_PID

# 4. Verify deployment succeeded
firebase firestore:indexes ls
```

---

## 🧪 MANUAL TEST CASES

### Test 1: Admin Can Read All Settings
**Actor**: Admin user (uid=`admin-uid-here`, admin custom claim = true)  
**Action**: Read from `settings/site-config`  
**Expected**: ✅ ALLOW

```javascript
// In Firebase Console → Firestore → Run Query
collection('settings').doc('site-config').get()
// Should return data if admin is logged in
```

### Test 2: Non-Admin Cannot Read Settings
**Actor**: Regular user (uid=`user-uid-here`, no admin claim)  
**Action**: Read from `settings/site-config`  
**Expected**: ✅ DENY (permission-denied error)

```javascript
// As regular user in web app
db.collection('settings').doc('site-config').get()
  .catch(err => console.log(err.code)); // Should log 'permission-denied'
```

### Test 3: User Can Read Own Profile
**Actor**: User (uid=`user-123`)  
**Action**: Read `users/user-123`  
**Expected**: ✅ ALLOW

```javascript
db.collection('users').doc('user-123').get()
  // Should return user's own data
```

### Test 4: User Cannot Read Another User's Profile
**Actor**: User (uid=`user-123`)  
**Action**: Read `users/user-456`  
**Expected**: ✅ DENY (permission-denied)

```javascript
db.collection('users').doc('user-456').get()
  .catch(err => console.log(err.code)); // Should log 'permission-denied'
```

### Test 5: User Cannot Modify Own Admin Status
**Actor**: User (uid=`user-123`, admin=false)  
**Action**: Update `users/user-123` with `admin: true`  
**Expected**: ✅ DENY (permission-denied)

```javascript
db.collection('users').doc('user-123').update({
  admin: true  // Should be rejected
}).catch(err => console.log(err.code)); // 'permission-denied'
```

### Test 6: Anyone Can Read Public Leaderboard
**Actor**: Any authenticated user  
**Action**: Read `leaderboard/any-user`  
**Expected**: ✅ ALLOW

```javascript
db.collection('leaderboard').get()
  .then(snap => console.log(snap.size)); // Should return leaderboard entries
```

### Test 7: Non-Admin Cannot Write to Leaderboard
**Actor**: Regular user  
**Action**: Write to `leaderboard/any-user`  
**Expected**: ✅ DENY

```javascript
db.collection('leaderboard').doc('user-456').set({score: 999})
  .catch(err => console.log(err.code)); // 'permission-denied'
```

### Test 8: User Cannot Delete Own Activity Log
**Actor**: User (uid=`user-123`)  
**Action**: Delete `activities/user-123/activity-456`  
**Expected**: ✅ DENY (immutable audit log)

```javascript
db.collection('activities').doc('user-123')
  .collection('activities').doc('activity-456').delete()
  .catch(err => console.log(err.code)); // 'permission-denied'
```

### Test 9: User Can Submit Feedback
**Actor**: Any authenticated user  
**Action**: Create `feedback/new-feedback-doc`  
**Expected**: ✅ ALLOW

```javascript
db.collection('feedback').add({
  userId: auth.currentUser.uid,
  message: "Love this app!",
  createdAt: new Date()
}).then(doc => console.log('Feedback submitted:', doc.id));
```

### Test 10: Admin Can Update Feature Flags
**Actor**: Admin user  
**Action**: Update `featureFlags/new-feature`  
**Expected**: ✅ ALLOW

```javascript
db.collection('featureFlags').doc('new-feature').set({
  enabled: true,
  rolloutPercentage: 50
}).then(() => console.log('Flag updated'));
```

---

## 🚨 KNOWN LIMITATIONS

1. **Cascade Deletes**: Deleting a user document does NOT automatically cascade-delete their activities, quizzes, etc. You must handle this in a Cloud Function or manually.

2. **Friend Request Bidirectionality**: If user A sends a request to user B, the document stores BOTH UIDs in `participants` array. Make sure frontend sends both UIDs when creating the request:
   ```javascript
   db.collection('friendRequests').add({
     participants: [currentUser.uid, targetUser.uid],
     from: currentUser.uid,
     to: targetUser.uid,
     status: 'pending'
   });
   ```

3. **Quiz Permissions**: Only the creator OR an admin can modify/delete a quiz. No group editing is supported by these rules.

---

## 📋 POST-DEPLOYMENT VERIFICATION

After deploying, run this checklist:

- [ ] Admin can access `/admin` dashboard without errors
- [ ] Regular users can view their own profile
- [ ] Leaderboard loads in 95th percentile < 2s
- [ ] Score submission completes within 100ms
- [ ] No "permission-denied" errors in console for legitimate actions
- [ ] Test all user-facing CRUD operations (Create, Read, Update, Delete)

---

## 🔄 ROLLBACK PLAN

If critical issues arise:

```bash
# Restore previous rules from git or backup
git checkout HEAD~ -- firestore.rules

# Deploy rollback
firebase deploy --only firestore:rules

# Notify team of rollback
```

---

## 📞 SUPPORT & ESCALATION

**If rules block legitimate traffic:**
1. Check the exact error message in Firebase Console → Cloud Logging
2. Verify the user's custom claims (Firebase Auth → User → Custom Claims)  
3. Cross-reference the action against the corresponding rule in `firestore.rules`
4. Update the rule if necessary, test, and re-deploy

**Critical issues**: Immediately rollback and investigate.

---

**Next Step**: Run deployment checklist and test cases above before merging to production.
