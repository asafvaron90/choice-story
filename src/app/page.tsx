"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "@choiceStoryWeb/firebase";
import { User } from "firebase/auth";
import { useTranslation } from "./hooks/useTranslation";
import { useFirestore } from "./hooks/useFirestore";
import Image from 'next/image';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const { t } = useTranslation();
  useFirestore(user); // Keep this to log the data

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Authentication functions removed as they are currently unused

  return (
    <main>
      <div className="hero__block">
        <div className="container">
          <div className="outer__hero fade-in">
            <div className="hero__image">
              <Image 
                src="/landing-page-images/heroimage.png" 
                alt="heroimage" 
                width={600}
                height={450}
                priority
              />
            </div>
            <div className="hero__info">
              <h1 className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                Choice<span className="text-purple-600">Story</span>
              </h1>
              <h6>{t.hero.subtitle}</h6>
              <p>{t.hero.description}</p>
              <div className="hero__text">
                <span></span>
                <p>{t.hero.detailedText1}</p>
                <p className="hero__big">{t.hero.detailedText2}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="story__block">
        <div className="container">
          <div className="outer__story fade-in">
            <h2>{t.story.title}</h2>
            <div className="story__desc">
              <p>{t.story.description}</p>
            </div>
            <div className="story__image">
              <Image 
                src="/landing-page-images/storyimage.png" 
                alt="storyimage" 
                width={800}
                height={500}
              />
            </div>
            <div className="story__small">
              <Image 
                src="/landing-page-images/storysmall.png" 
                alt="storysmall" 
                width={400}
                height={250}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="desc__block">
        <div className="container">
          <div className="outer__desc fade-in">
            <Image 
              src="/landing-page-images/descimage.svg" 
              alt="descimage" 
              width={600}
              height={400}
            />
            <h2>{t.benefits.title}</h2>
            <ul>
              {t.benefits.items.map((item, index) => (
                <li key={index}>
                  <span>
                    <Image 
                      src={`/landing-page-images/desc${index + 1}.svg`} 
                      alt={`desc${index + 1}`} 
                      width={40}
                      height={40}
                    />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="contact__form">
        <div className="container">
          <div className="outer__contact">
            <div className="form__inner">
              <h2>{t.contact.title}</h2>
              <p>{t.contact.subtitle}</p>
              {/* Contact form implementation here */}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
