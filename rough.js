import admin from "firebase-admin";

// ==============================
//  1. SERVICE ACCOUNT CREDENTIALS
// ==============================
const serviceAccount = {
    "type": "service_account",
    "project_id": "parcel-sewa",
    "private_key_id": "48ee37710f2699986cbda80492e49b1dd9c704ee",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCUeEj3DmvBMbqk\n2u4Aaw0nz/7OdxEPCv9uEx8rzRIwLxUxta64tpbBM+WxFu5u3DIx3eXkwFduOnIu\nb1Ifzs5EGqbxTIbXaHXX8AkUZHpuwmDDvSsGyCL3MOWo1nma2744GWE9ERlmeqOo\ntVAJMLF1P2CuPEXUcmHp4TZdKsEL86I8e2ZWt78piMmMDmRFOvOwvoLSqKJfOYGQ\nRq9ahFWc4AClvhyXm6R2eg3/+n+ZPHw/qROS2N8La2envdIqv/o2Js20dc7Pch/A\nsHMtFpol7gb552B13p3IgGwRXddNxYE59dim4bC/PpwU4Q38a0lSY0cc+4ZAlrEU\nApejBUsHAgMBAAECggEAC+LjyvO0NY/Ec48beTXlpCEgzM+RGNuc8ed4Zv22zdvw\nt6QZMt/BvgICCsvdMH7sfdWLPDJLgNJ12Ow/1OmuCQHHovXcR1tgY9zrVsVpXK8V\njbyTuN1FzCh1mnv62SafWfpq/VD+VmTNiXCXa16Jabhpn+L8OP/w56Du+BKElgil\nTIQNjn8mUC6UG276gtgQM7I8eHNWq4hAXyobd9FQpZUc8qfAjC/w/7JF+ZosFPtL\nV1tYQK7Ibr1+iuRvFY5FwoFxevpnNADD0j9LNv8XH/aKdIcW0oMbscdpYD+18G65\nGmoOXHR1uutnHngNG+oa/xxOfuFVenv/fG2wo3C28QKBgQDD9z7ONS+KY9phG+IH\njFCWkHVwtPaQhd8c8rR8G5n2+dyAR3hR3bEDQfxlEb738X2cUymggRmeu0DUXXhM\nkX8VnE0b+F1MPw3a5p+HpnR30FnHOwZidu5qRTKZkO3/aZRW7b/PY5LcJmsUs1I6\n9AGF1BZusWEiC2WMV1ifSsZnPQKBgQDB9CM4FQvEd4g4IkSzwXmLpWMeC9PgXvBO\nHy1nodOmLhnhdJXFYbJnJCHjmo60rrRW55XQq3zhE1sg9lJibh0w/YCU91WgmZDp\ngOYMdLPAciX1oLV2c92weUvpbkq7pM8E4yenUqqgtoOvLor2DCPee+8CTcA8exFQ\nMwOd2XA/kwKBgDABxvIPV3kooxv9D69XsXphI1QcEPcwxIq77nkk7d/yMBGA8Lnl\nfHLW3HUKFuV41JPST7VRSyx2pRghWdIwJpjttHowqvJ90/AXZWd+4LNlaEkFbbf7\neMax8wZp2dQjUkLFdaLhut2Rz9O/Zlqo4iKd5WzyqWAEuLjbwQss71PlAoGBAJc0\nUVCjd60O0u+QJ6dLqgooQYFnDyLYYNdGjws/qdTgE+UkEq7yXzbxgEoEcESD/qvR\nl4Y6avy9LkogPlHmLnPG7bs0p1iw37xqdO44/PmHA/jd9RoHckjmBzxQc4qeDZZt\n0LgtRkBMiZTE4Ci5hi0oyUgufTOpbfHsE2G35j5pAoGAWcUTjKa5PCmbaxDx3NZO\nTN6Qjlk9bDSniZX0GtKcRJAXpLN/Tlxmq0PbPRdmgUkctEXEIlM+/tP/KuEj8Z1H\nHFJffVvCGln2CdGfdH26/fsGrYIJyGNGgyvFm7NHIgj29ELE4VBi4mHHwUfNkDMo\nxYkx2yxBWGwaups4qGVF1Yg=\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk-fbsvc@parcel-sewa.iam.gserviceaccount.com",
    "client_id": "115041008052174268907",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40parcel-sewa.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
}
// ==============================
// 2. INITIALIZE FIREBASE ADMIN
// ==============================
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

// ==============================
//  3. UPDATE SCRIPT
// ==============================
async function updateOrders() {
    try {
        const snapshot = await db.collection("Confirm Orders").get();

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();

            const deliveryStatusBoolean =
                data.deliveryStatus !== "Yet to reach border";

            await docSnap.ref.update({
                deliveryStatus: false,
                deliveryDate: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`Updated → ${docSnap.id}`);
            console.log(data.name);

            

         
        }

        console.log("🔥 All documents updated successfully!");
    } catch (err) {
        console.error("❌ Error:", err);
    }
}

updateOrders();
