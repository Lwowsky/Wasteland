function collectionErrorKey(collectionName) {
  return String(collectionName || "collection")
    .replace(/[^a-z0-9]+/gi, "_")
    .toUpperCase();
}

export async function listFirestoreDocuments(env, token, collectionName) {
  if (!env.FIREBASE_PROJECT_ID || !token) {
    return [];
  }

  const documents = [];
  let pageToken = "";

  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}` +
        `/databases/(default)/documents/${collectionName}`,
    );

    url.searchParams.set("pageSize", "100");

    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new Error(`FIRESTORE_LIST_${collectionErrorKey(collectionName)}_FAILED`);
    }

    const payload = await response.json();
    documents.push(...(payload.documents || []));
    pageToken = payload.nextPageToken || "";
  } while (pageToken);

  return documents;
}

export async function deleteFirestoreCollection(env, token, collectionName) {
  const documents = await listFirestoreDocuments(env, token, collectionName);

  for (let index = 0; index < documents.length; index += 20) {
    const batch = documents.slice(index, index + 20);
    const responses = await Promise.all(
      batch.map((document) =>
        fetch(`https://firestore.googleapis.com/v1/${document.name}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ),
    );

    if (responses.some((response) => !response.ok && response.status !== 404)) {
      throw new Error(
        `FIRESTORE_DELETE_${collectionErrorKey(collectionName)}_FAILED`,
      );
    }
  }

  return documents.length;
}

function firestoreDocumentId(document) {
  return String(document?.name || "").split("/").pop() || "";
}

export async function restoreFirestoreDocuments(
  env,
  token,
  collectionName,
  documents,
) {
  if (!env.FIREBASE_PROJECT_ID || !token || !Array.isArray(documents)) {
    return;
  }

  await deleteFirestoreCollection(env, token, collectionName);

  for (const document of documents) {
    const documentId = firestoreDocumentId(document);

    if (!documentId) {
      continue;
    }

    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}` +
        `/databases/(default)/documents/${collectionName}`,
    );
    url.searchParams.set("documentId", documentId);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fields: document.fields || {} }),
    });

    if (!response.ok) {
      throw new Error(
        `FIRESTORE_RESTORE_${collectionErrorKey(collectionName)}_FAILED`,
      );
    }
  }
}
