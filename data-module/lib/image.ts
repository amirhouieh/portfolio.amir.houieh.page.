import * as path from "path";
import * as uniqid from "uniqid";
import {Image, ImageSizes} from "./types";
import * as sharp from "sharp";
import {isNumber} from "./utils";
import {IMAGES_DIR} from "./consts";
import {copyFileSync} from "fs";

const createResponsiveImageName = (id: string, size: number, ext: string) => {
    return `${id}-${size}${ext}`;
};

export interface ImageSize { path: string, size: number }

const resizeHandlerFactory = (inPath: string) => {
    const imageFilename = path.basename(inPath);
    const id = uniqid();
    const ext = path.extname(imageFilename);

    return (size: number): Promise<ImageSize> => {
        const filename = createResponsiveImageName(id, size, ext);
        const outputPath = path.join(IMAGES_DIR, filename);
        return sharp(inPath)
        .resize(size)
        .toFile(outputPath)
        .then(() => ({
            path: path.join("images", filename),
            size,
        }));
    }
};

export const processImage = async (imagePath: string, projectTitle: string): Promise<Image> => {
    const imageFilename = path.basename(imagePath);
    const resize = resizeHandlerFactory(imagePath);

    let order = -1;
    let caption = null;

    if (imageFilename.indexOf("__") > -1) {
        caption = imageFilename.split("__")[1];
    }

    if (isNumber(imageFilename[0])) {
        order = parseInt(imageFilename[0]);
    }

    console.log("imageFilename", imageFilename, path.extname(imageFilename) );

    if(path.extname(imageFilename) === ".gif"){
        const newName = new Date().getTime()+imageFilename;
        const outputPath = path.join(IMAGES_DIR,newName );
        try {
            await copyFileSync(imagePath, outputPath);
            return {
                src: path.join("images", newName),
                srcSet: [{path: path.join("images", newName), size: 600}],
                caption,
                alt: caption ? caption : projectTitle + "-" + imageFilename,
                order,
            };
        } catch (e) {
            console.log(e);
            console.log("ERROR: copying gif image", imagePath);
        }
    }

    try {
        const imageSizes = [ImageSizes.SMALL, ImageSizes.MEDIUM, ImageSizes.LARGE];

        const sizes = await Promise.all(imageSizes.map(resize))
            .then((tasks) => tasks.sort((b, a) => b.size - a.size));

        return {
            src: `${sizes[0].path}`,
            srcSet: sizes,
            caption,
            alt: caption ? caption : projectTitle + "-" + imageFilename,
            order,
        };

    } catch (e) {
        console.log(e);
        console.log("ERROR: resizing images", imagePath);
    }
};
