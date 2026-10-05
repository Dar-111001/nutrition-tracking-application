export function createPageUrl(pageName) {
    return '/' + pageName.toLowerCase().replace(/ /g, '-');
}
