/**
 * The heading block at the top of every page: the page's only <h1>, a subtitle,
 * and optional actions under it.
 *
 * tabIndex={-1} lets Layout move focus here after each navigation, so screen
 * readers announce the new page; it is not a tab stop.
 */
export default function PageHeader({ title, subtitle, children }) {
    return (
        <div className="text-center mb-12">
            <h1 tabIndex={-1} className="text-4xl md:text-6xl font-light text-gray-800 mb-4 focus:outline-none">
                {title}
                {subtitle && (
                    <span className="block text-2xl md:text-3xl text-gray-500 font-normal mt-2">{subtitle}</span>
                )}
            </h1>
            {children}
        </div>
    );
}
