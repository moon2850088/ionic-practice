import { useState, useEffect } from "react";
import { useCamera } from "@ionic/react-hooks/camera";
import { useFilesystem, base64FromPath } from "@ionic/react-hooks/filesystem";
import { useStorage } from "@ionic/react-hooks/storage";
import { isPlatform } from "@ionic/react";
import {
  CameraResultType,
  CameraSource,
  CameraPhoto,
  Capacitor,
  FilesystemDirectory,
} from "@capacitor/core";

export interface Photo {
  filepath: string;
  webviewPath?: string;
  base64?: string;
}

const PHOTO_STORAGE = "photo";
export function usePhotoGallery() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const { get, set } = useStorage();

  const { deleteFile, getUri, readFile, writeFile } = useFilesystem();

  const { getPhoto } = useCamera();

  useEffect(() => {
    const loadSaved = async () => {
      const photoString = await get(PHOTO_STORAGE);
      const photosInStorage = (photoString
        ? JSON.parse(photoString)
        : []) as Photo[];

      if (!isPlatform("hybrid")) {
        for (let photo of photosInStorage) {
          const file = await readFile({
            path: photo.filepath,
            directory: FilesystemDirectory.Data,
          });
          photo.base64 = `data:image/jpeg;base64, ${file.data}`;
        }
      }

      setPhotos(photosInStorage);
    };
    loadSaved();
  }, [get, readFile]);

  const takePhoto = async () => {
    const cameraPhoto = await getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100,
    });

    const fileName = new Date().getTime() + ".jpeg";
    const savedFileImage = await savePicture(cameraPhoto, fileName);
    const newPhotos = [savedFileImage, ...photos];
    setPhotos(newPhotos);
    set(
      PHOTO_STORAGE,
      isPlatform("hybrid")
        ? JSON.stringify(newPhotos)
        : JSON.stringify(
            newPhotos.map((p) => {
              const photoCopy = { ...p };
              delete photoCopy.base64;
              return photoCopy;
            })
          )
    );
  };

  const savePicture = async (
    photo: CameraPhoto,
    fileName: string
  ): Promise<Photo> => {
    let base64Data: string;
    if (isPlatform("hybrid")) {
      const file = await readFile({
        path: photo.path!,
      });
      base64Data = file.data;
    } else {
      base64Data = await base64FromPath(photo.webPath!);
    }
    const savedFile = await writeFile({
      path: fileName,
      data: base64Data,
      directory: FilesystemDirectory.Data,
    });

    if (isPlatform("hybrid")) {
      return {
        filepath: savedFile.uri,
        webviewPath: Capacitor.convertFileSrc(savedFile.uri),
      };
    } else {
      return {
        filepath: fileName,
        webviewPath: photo.webPath,
      };
    }
  };

  return {
    photos,
    takePhoto,
  };
}
