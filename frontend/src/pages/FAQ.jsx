// src/pages/FAQ.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Nav from '../components/Nav';
import { syncHeaderAlertHeights } from '../utils/layoutOffsets';
import '../styles/faq.css';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

export default function FAQ() {
  const [language, setLanguage] = useState('en');
  const [openItems, setOpenItems] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  
  const heroRef = useRef(null);
  const searchRef = useRef(null);
  const faqRefs = useRef([]);

  // Get language from localStorage
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setLanguage(savedLanguage);
  }, []);

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      const savedLanguage = localStorage.getItem('language') || 'en';
      setLanguage(savedLanguage);
    };

    window.addEventListener('languageChanged', handleLanguageChange);
    return () => window.removeEventListener('languageChanged', handleLanguageChange);
  }, []);

  // Sync layout offsets when component mounts
  useEffect(() => {
    syncHeaderAlertHeights();
  }, []);

  // Animation setup
  useEffect(() => {
    if (!heroRef.current) return;

    // Hero animation
    gsap.fromTo(heroRef.current, 
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1, ease: "power3.out" }
    );

    // Search animation
    gsap.fromTo(searchRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", delay: 0.3 }
    );

    // FAQ items animation
    ScrollTrigger.batch(faqRefs.current, {
      onEnter: (elements) => {
        gsap.fromTo(elements,
          { opacity: 0, y: 30 },
          { 
            opacity: 1, 
            y: 0, 
            duration: 0.6, 
            stagger: 0.1,
            ease: "power3.out"
          }
        );
      },
      start: "top 85%"
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  const toggleFAQ = (index) => {
    setOpenItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const faqs = language === 'en' ? [
    {
      category: "General",
      question: "What is SmartBlood Connect?",
      answer: "SmartBlood Connect is Kerala's premier blood donation platform that connects donors, recipients, and hospitals in real-time to save lives efficiently."
    },
    {
      category: "General",
      question: "How does the blood matching work?",
      answer: "Our advanced algorithm matches blood requests with compatible donors based on blood type, location, availability, and urgency in real-time."
    },
    {
      category: "Donation",
      question: "Who can donate blood?",
      answer: "Healthy adults aged 18-65, weighing at least 50kg, with hemoglobin levels above 12.5g/dL, and meeting medical screening requirements."
    },
    {
      category: "Donation",
      question: "How often can I donate blood?",
      answer: "Men can donate every 3 months, women every 4 months. This ensures adequate time for blood cell regeneration."
    },
    {
      category: "Donation",
      question: "Is blood donation safe?",
      answer: "Yes, blood donation is completely safe. We use sterile equipment, follow strict protocols, and conduct thorough health screenings."
    },
    {
      category: "Request",
      question: "How do I request blood for a patient?",
      answer: "Registered hospitals can create blood requests through our platform. Emergency requests are prioritized and sent to compatible donors instantly."
    },
    {
      category: "Request",
      question: "What information do I need to provide?",
      answer: "Patient's blood type, quantity needed, hospital details, urgency level, and contact information for coordination."
    },
    {
      category: "Technical",
      question: "Is my personal information secure?",
      answer: "Absolutely. We use bank-level encryption, comply with data protection laws, and never share personal information without consent."
    },
    {
      category: "Technical",
      question: "Can I use the app offline?",
      answer: "The app works online for real-time features. Basic information is cached for offline viewing, but internet connection is required for matching."
    },
    {
      category: "Technical",
      question: "How do I update my availability?",
      answer: "Log into your donor dashboard and update your availability status. You can set specific time slots or mark yourself as always available."
    }
  ] : [
    {
      category: "പൊതു",
      question: "സ്മാർട്ട് ബ്ലഡ് കണക്ട് എന്താണ്?",
      answer: "സ്മാർട്ട് ബ്ലഡ് കണക്ട് കേരളത്തിന്റെ പ്രമുഖ രക്തദാന പ്ലാറ്റ്ഫോമാണ്, ദാനികൾ, സ്വീകർത്താക്കൾ, ആശുപത്രികൾ എന്നിവയെ റിയൽ-ടൈമിൽ ബന്ധിപ്പിക്കുന്നു."
    },
    {
      category: "പൊതു",
      question: "രക്ത മാച്ചിംഗ് എങ്ങനെ പ്രവർത്തിക്കുന്നു?",
      answer: "ഞങ്ങളുടെ മുമ്പോട്ടുള്ള അൽഗോരിതം രക്ത ഗ്രൂപ്പ്, സ്ഥലം, ലഭ്യത, അടിയന്തരത്വം എന്നിവയുടെ അടിസ്ഥാനത്തിൽ രക്ത അഭ്യർത്ഥനകളെ യോജിപ്പുള്ള ദാനികളുമായി റിയൽ-ടൈമിൽ മാച്ച് ചെയ്യുന്നു."
    },
    {
      category: "ദാനം",
      question: "ആരാണ് രക്തം ദാനം ചെയ്യാൻ കഴിയുക?",
      answer: "18-65 വയസ്സ്, കുറഞ്ഞത് 50 കിലോഗ്രാം ഭാരം, 12.5g/dL-ൽ കൂടുതൽ ഹീമോഗ്ലോബിൻ, മെഡിക്കൽ സ്ക്രീനിംഗ് ആവശ്യകതകൾ പാലിക്കുന്ന ആരോഗ്യമുള്ള മുതിർന്നവർ."
    },
    {
      category: "ദാനം",
      question: "എത്ര തവണ രക്തം ദാനം ചെയ്യാം?",
      answer: "പുരുഷന്മാർക്ക് 3 മാസം കൂടെ, സ്ത്രീകൾക്ക് 4 മാസം കൂടെ. ഇത് രക്ത കോശങ്ങളുടെ പുനരുത്പാദനത്തിന് മതിയായ സമയം ഉറപ്പാക്കുന്നു."
    },
    {
      category: "ദാനം",
      question: "രക്തദാനം സുരക്ഷിതമാണോ?",
      answer: "അതെ, രക്തദാനം പൂർണ്ണമായും സുരക്ഷിതമാണ്. ഞങ്ങൾ മാലിന്യരഹിത ഉപകരണങ്ങൾ ഉപയോഗിക്കുന്നു, കർശനമായ നിയമാവലികൾ പാലിക്കുന്നു."
    },
    {
      category: "അഭ്യർത്ഥന",
      question: "രോഗിക്ക് രക്തം അഭ്യർത്ഥിക്കാൻ എങ്ങനെ?",
      answer: "രജിസ്റ്റർ ചെയ്ത ആശുപത്രികൾ ഞങ്ങളുടെ പ്ലാറ്റ്ഫോമിലൂടെ രക്ത അഭ്യർത്ഥനകൾ സൃഷ്ടിക്കാം. അടിയന്തര അഭ്യർത്ഥനകൾ മുൻഗണന നൽകുന്നു."
    },
    {
      category: "അഭ്യർത്ഥന",
      question: "എന്ത് വിവരങ്ങൾ നൽകണം?",
      answer: "രോഗിയുടെ രക്തഗ്രൂപ്പ്, ആവശ്യമായ അളവ്, ആശുപത്രി വിവരങ്ങൾ, അടിയന്തരത്വം, കോർഡിനേഷനായി കോൺടാക്റ്റ് വിവരങ്ങൾ."
    },
    {
      category: "സാങ്കേതികം",
      question: "എന്റെ വ്യക്തിഗത വിവരങ്ങൾ സുരക്ഷിതമാണോ?",
      answer: "തീർച്ചയായും. ഞങ്ങൾ ബാങ്ക് തലത്തിലുള്ള എൻക്രിപ്ഷൻ ഉപയോഗിക്കുന്നു, ഡാറ്റാ സംരക്ഷണ നിയമങ്ങൾ പാലിക്കുന്നു."
    },
    {
      category: "സാങ്കേതികം",
      question: "ആപ്പ് ഓഫ്ലൈനിൽ ഉപയോഗിക്കാമോ?",
      answer: "റിയൽ-ടൈം സവിശേഷതകൾക്കായി ആപ്പ് ഓൺലൈനിൽ പ്രവർത്തിക്കുന്നു. അടിസ്ഥാന വിവരങ്ങൾ ഓഫ്ലൈൻ കാണാനായി കാഷ് ചെയ്യുന്നു."
    },
    {
      category: "സാങ്കേതികം",
      question: "ലഭ്യത എങ്ങനെ അപ്ഡേറ്റ് ചെയ്യാം?",
      answer: "നിങ്ങളുടെ ദാനി ഡാഷ്ബോർഡിൽ ലോഗിൻ ചെയ്ത് ലഭ്യത സ്റ്റാറ്റസ് അപ്ഡേറ്റ് ചെയ്യുക. നിശ്ചിത സമയ സ്ലോട്ടുകൾ സജ്ജീകരിക്കാം."
    }
  ];

  const categories = language === 'en' 
    ? ["All", "General", "Donation", "Request", "Technical"]
    : ["എല്ലാം", "പൊതു", "ദാനം", "അഭ്യർത്ഥന", "സാങ്കേതികം"];

  const [selectedCategory, setSelectedCategory] = useState(categories[0]);

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === categories[0] || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <Nav />
      <main className="faq-page">
      {/* Hero Section */}
      <section ref={heroRef} className="faq-hero">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">
              {language === 'en' ? 'Frequently Asked Questions' : 'പതിവ് ചോദ്യങ്ങൾ'}
            </h1>
            <p className="hero-subtitle">
              {language === 'en'
                ? 'Find answers to common questions about blood donation and our platform.'
                : 'രക്തദാനത്തെയും ഞങ്ങളുടെ പ്ലാറ്റ്ഫോമിനെയും കുറിച്ചുള്ള പൊതുവായ ചോദ്യങ്ങൾക്കുള്ള ഉത്തരങ്ങൾ കണ്ടെത്തുക.'}
            </p>
          </div>
        </div>
      </section>

      {/* Search and Filter Section */}
      <section className="search-section">
        <div className="container">
          <div ref={searchRef} className="search-container">
            <div className="search-box">
              <input
                id="faq-search-input"
                name="faqSearch"
                type="text"
                placeholder={language === 'en' ? 'Search FAQs...' : 'FAQ തിരയുക...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
                aria-label="Search FAQs"
              />
              <div className="search-icon">🔍</div>
            </div>
            
            <div className="category-filters">
              {categories.map((category, index) => (
                <button
                  key={index}
                  className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <div className="container">
          <div className="faq-grid">
            {filteredFAQs.map((faq, index) => (
              <div
                key={index}
                ref={el => faqRefs.current[index] = el}
                className={`faq-item ${openItems[index] ? 'open' : ''}`}
              >
                <div className="faq-header" onClick={() => toggleFAQ(index)}>
                  <div className="faq-question">
                    <span className="faq-category">{faq.category}</span>
                    <h3>{faq.question}</h3>
                  </div>
                  <div className="faq-icon">
                    <span className={`icon ${openItems[index] ? 'rotate' : ''}`}>+</span>
                  </div>
                </div>
                <div className={`faq-answer ${openItems[index] ? 'visible' : ''}`}>
                  <p>{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
          
          {filteredFAQs.length === 0 && (
            <div className="no-results">
              <div className="no-results-icon">❓</div>
              <h3>
                {language === 'en' ? 'No FAQs Found' : 'FAQ കണ്ടെത്തിയില്ല'}
              </h3>
              <p>
                {language === 'en' 
                  ? 'Try adjusting your search terms or category filter.'
                  : 'നിങ്ങളുടെ തിരയൽ പദങ്ങൾ അല്ലെങ്കിൽ വിഭാഗ ഫിൽട്ടർ ക്രമീകരിക്കാൻ ശ്രമിക്കുക.'}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact-cta">
        <div className="container">
          <div className="cta-content">
            <h2>
              {language === 'en' ? 'Still Have Questions?' : 'ഇപ്പോഴും ചോദ്യങ്ങൾ ഉണ്ടോ?'}
            </h2>
            <p>
              {language === 'en'
                ? 'Our support team is here to help you with any questions or concerns.'
                : 'ഏത് ചോദ്യങ്ങൾക്കും ആശങ്കകൾക്കും നിങ്ങളെ സഹായിക്കാൻ ഞങ്ങളുടെ പിന്തുണ ടീം ഇവിടെയുണ്ട്.'}
            </p>
            <div className="cta-buttons">
              <Link to="/contact" className="btn btn--primary btn--large">
                {language === 'en' ? 'Contact Us' : 'ഞങ്ങളെ ബന്ധപ്പെടുക'}
              </Link>
              <Link to="/" className="btn btn--outline btn--large">
                {language === 'en' ? 'Back to Home' : 'ഹോമിലേക്ക് മടങ്ങുക'}
              </Link>
            </div>
          </div>
        </div>
      </section>
      </main>
    </>
  );
}
