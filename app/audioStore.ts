"use client";
import { Bytes, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore/lite";
import type { FirebaseServices } from "./firebase";

// 무료 요금제에서는 파일 저장소(Storage)를 쓸 수 없어서, 음원 파일을 900KB 조각으로 나눠 데이터베이스에 저장함.
//   audioFiles/<id>               : 이름, 형식, 크기, 조각 수
//   audioFiles/<id>/chunks/000…   : 조각 (문서 하나는 1MB까지)
// 음원 주소가 "db:<id>"이면 이 저장소의 파일, "/audio/…"처럼 그 밖의 주소는 사이트에 함께 올라간 파일.
export const DB_AUDIO = "db:";
export const MAX_AUDIO_MB = 15;
const CHUNK = 900 * 1024;

export const isDbAudio = (src?: string) => !!src && src.startsWith(DB_AUDIO);

export async function uploadAudio(fb: FirebaseServices, file: File, onProgress: (ratio: number) => void): Promise<string> {
  const meta = doc(collection(fb.db, "audioFiles"));
  const bytes = new Uint8Array(await file.arrayBuffer());
  const count = Math.ceil(bytes.length / CHUNK);
  for (let i = 0; i < count; i++) {
    const part = Bytes.fromUint8Array(bytes.subarray(i * CHUNK, (i + 1) * CHUNK));
    await setDoc(doc(fb.db, "audioFiles", meta.id, "chunks", String(i).padStart(3, "0")), { data: part });
    onProgress((i + 1) / count);
  }
  // 조각을 다 올린 뒤에 정보를 적음 (중간에 끊기면 정보가 없어 재생 목록에 쓰이지 않음)
  await setDoc(meta, { name: file.name, type: file.type, size: file.size, chunks: count, createdAt: serverTimestamp() });
  return DB_AUDIO + meta.id;
}

const urls = new Map<string, Promise<string>>();

// 재생할 때 조각을 모아 브라우저 안에서 파일로 되돌림 (한 번 받은 곡은 다시 받지 않음)
export function audioUrl(fb: FirebaseServices, src: string): Promise<string> {
  if (!isDbAudio(src)) return Promise.resolve(src);
  let url = urls.get(src);
  if (!url) {
    const id = src.slice(DB_AUDIO.length);
    url = (async () => {
      const [meta, parts] = await Promise.all([getDoc(doc(fb.db, "audioFiles", id)), getDocs(collection(fb.db, "audioFiles", id, "chunks"))]);
      const chunks = parts.docs
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((d) => (d.data().data as Bytes).toUint8Array() as Uint8Array<ArrayBuffer>);
      return URL.createObjectURL(new Blob(chunks, { type: (meta.data()?.type as string) || "audio/mpeg" }));
    })();
    url.catch(() => urls.delete(src));
    urls.set(src, url);
  }
  return url;
}

export async function deleteAudio(fb: FirebaseServices, src?: string) {
  if (!isDbAudio(src)) return;
  const id = src!.slice(DB_AUDIO.length);
  const parts = await getDocs(collection(fb.db, "audioFiles", id, "chunks"));
  await Promise.all(parts.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(fb.db, "audioFiles", id));
}
