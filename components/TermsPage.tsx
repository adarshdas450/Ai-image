import React from 'react';
import Header from './Header';

const TermsPage: React.FC = () => {
  return (
    <>
      <Header active="terms" />
      <main className="min-h-screen p-4 sm:p-6 lg:p-8 pt-24 sm:pt-28">
        <div className="w-full max-w-4xl mx-auto" data-fade-in>
          <header className="text-center w-full max-w-5xl mx-auto my-8 md:my-16">
            <h1 
                className="text-5xl sm:text-7xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 glitch"
                data-text="Terms & Conditions"
              >
                Terms & Conditions
              </h1>
            <p className="text-gray-400 text-lg md:text-xl mt-2">Please read our terms of use carefully.</p>
          </header>

          <div className="panel panel-cut p-8 space-y-6 text-gray-300">
            <div>
              <h2 className="text-xl font-bold text-cyan-300 uppercase tracking-wider mb-2">1. Acceptance of Terms</h2>
              <p>By accessing and using AI Image Forge, you accept and agree to be bound by the terms and provision of this agreement. This is a placeholder document and is not legally binding.</p>
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-cyan-300 uppercase tracking-wider mb-2">2. Content Ownership</h2>
              <p>You retain all rights to the text prompts you provide. The generated images are provided to you under the terms of service of the underlying generative AI model (Google Gemini API). You are responsible for ensuring your use of the generated images complies with all applicable laws and the AI provider's policies.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-cyan-300 uppercase tracking-wider mb-2">3. Prohibited Use</h2>
              <p>You agree not to use this service to generate content that is unlawful, harmful, defamatory, obscene, or otherwise objectionable. We reserve the right to terminate access for users who violate these terms.</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-cyan-300 uppercase tracking-wider mb-2">4. Disclaimer of Warranty</h2>
              <p>This service is provided "as is" without any warranties of any kind. We do not guarantee the accuracy, completeness, or usefulness of any generated content.</p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default TermsPage;
