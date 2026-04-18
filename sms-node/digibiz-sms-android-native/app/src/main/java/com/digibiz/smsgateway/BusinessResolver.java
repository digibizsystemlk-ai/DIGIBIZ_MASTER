package com.digibiz.smsgateway;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.google.android.gms.tasks.Tasks;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.QuerySnapshot;

import java.util.concurrent.ExecutionException;

/**
 * users/{uid}.businessId → businesses/{id}; else businesses where ownerId == uid; else businesses/{uid}.
 */
public final class BusinessResolver {
    private BusinessResolver() {
    }

    public static final class Biz {
        public final String id;
        public final String name;

        public Biz(String id, String name) {
            this.id = id;
            this.name = name != null ? name : "";
        }
    }

    @Nullable
    public static Biz resolveBlocking(@NonNull FirebaseFirestore db, @NonNull String uid)
            throws ExecutionException, InterruptedException {
        DocumentSnapshot userSnap = Tasks.await(db.collection("users").document(uid).get());
        String fromUser = "";
        if (userSnap.exists()) {
            Object bid = userSnap.get("businessId");
            if (bid != null) {
                fromUser = String.valueOf(bid).trim();
            }
        }

        if (!fromUser.isEmpty()) {
            DocumentSnapshot bizSnap = Tasks.await(db.collection("businesses").document(fromUser).get());
            if (bizSnap.exists()) {
                return pickBiz(bizSnap);
            }
            QuerySnapshot q = Tasks.await(
                    db.collection("businesses").whereEqualTo("ownerId", uid).limit(5).get());
            if (!q.isEmpty()) {
                return pickBiz(q.getDocuments().get(0));
            }
            DocumentSnapshot self = Tasks.await(db.collection("businesses").document(uid).get());
            return pickBiz(self);
        }

        QuerySnapshot qOwner = Tasks.await(
                db.collection("businesses").whereEqualTo("ownerId", uid).limit(5).get());
        if (!qOwner.isEmpty()) {
            return pickBiz(qOwner.getDocuments().get(0));
        }
        DocumentSnapshot selfSnap = Tasks.await(db.collection("businesses").document(uid).get());
        return pickBiz(selfSnap);
    }

    @Nullable
    private static Biz pickBiz(DocumentSnapshot snap) {
        if (snap == null || !snap.exists()) {
            return null;
        }
        String name = snap.getString("name");
        if (name == null || name.isEmpty()) {
            name = snap.getString("businessName");
        }
        if (name == null) {
            name = "";
        }
        return new Biz(snap.getId(), name);
    }
}
