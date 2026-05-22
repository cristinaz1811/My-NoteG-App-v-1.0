import React from 'react';
import Navbar from './Navbar';

// Wraps a page with the fixed Navbar and the top padding that offsets it.
// `padding` is a Tailwind class; pass null for pages that manage their own spacing.
const Layout = ({ children, padding = 'pt-16' }) => (
    <>
        <Navbar />
        {padding ? <div className={padding}>{children}</div> : children}
    </>
);

export default Layout;
