import React from 'react';

import Navbar from './Navbar';
import Hero from './Hero';
import Features from './Features';
import HowItWorks from './HowItWorks';
import Testimonials from './Testimonials';
import Pricing from './Pricing';
import FAQ from './FAQ';
import Footer from './Footer';

const LandingPage: React.FC = () =>
{
    return (
        <div className="min-h-screen bg-brand-black text-white selection:bg-brand-blue selection:text-white overflow-x-hidden">
            <Navbar />
            <main>
                <Hero />
                <Features />
                <HowItWorks />
                <Testimonials />
                <Pricing />
                <FAQ />
            </main>
            <Footer />
        </div>
    )
}

export default LandingPage;