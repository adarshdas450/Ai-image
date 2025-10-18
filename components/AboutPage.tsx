import React from 'react';
import Header from './Header';

const AboutPage: React.FC = () => {
  return (
    <>
      <Header active="about" />
      <main className="min-h-screen p-4 sm:p-6 lg:p-8 pt-24 sm:pt-28">
        <div className="w-full max-w-4xl mx-auto" data-fade-in>
          <header className="text-center w-full max-w-5xl mx-auto my-8 md:my-16">
            <h1 
                className="text-5xl sm:text-7xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 glitch"
                data-text="About AI Image Forge"
              >
                About AI Image Forge
              </h1>
            <p className="text-gray-400 text-lg md:text-xl mt-2">The future of digital creation.</p>
          </header>

          <div className="panel panel-cut p-8 space-y-4 text-gray-300">
            <p>Welcome to AI Image Forge, a cutting-edge application where technology and creativity collide. Our mission is to empower creators, designers, and dreamers by providing a powerful yet intuitive tool to generate stunning, unique images from simple text prompts.</p>
            <p>Powered by Google's state-of-the-art Gemini AI model, AI Image Forge translates your textual descriptions into visual masterpieces. Whether you're conceptualizing a character for a game, designing marketing materials, or simply exploring the bounds of your imagination, our platform is your canvas.</p>
            <p>This project is built with a modern tech stack, ensuring a fast, responsive, and seamless user experience. We are constantly exploring new features and improvements to make AI Image Forge the ultimate destination for AI-powered art generation.</p>
            <p>Thank you for joining us on this exciting journey. Let's forge the future, one image at a time.</p>
          </div>
        </div>
      </main>
    </>
  );
};

export default AboutPage;
