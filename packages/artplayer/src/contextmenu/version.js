export default function version(option) {
    return {
        ...option,
        html: `<a href="https://github.com/mm-o/ArtPlayer" target="_blank">SiYuan ArtPlayer ${process.env.APP_VER}</a>`,
    };
}
