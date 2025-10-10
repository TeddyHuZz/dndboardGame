import { useState } from "react";
import "./anding.css";

function Contact() {
  const [selectedSubject, setSelectedSubject] = useState('generalInquiry'); // Default value

  const handleChange = (event) => {
    setSelectedSubject(event.target.value);
  };

  return (
    <div className="Contact">
      <div className="contactHeader">
        <h1 className="contactTitle">Get in Touch</h1>
        <p className="contactDescription">
          Have questions about funding opportunities or need help with your application? 
          Our team of experts is here to support your funding journey every step of the way.
        </p>
      </div>

      {/* Contact Options */}
      <div className="contactContainer">
        <div className="firstContact">
          <h2>Email Support</h2>
          <p>Get help with your funding application or general inquiries via email.</p>
          <span>support@smefundmatch.com</span>
        </div>
        <div className="secondContact">
          <h2>Phone Support</h2>
          <p>Speak with our team directly via phone call for immediate assistance.</p>
          <span>+6012-345 678</span>
        </div>
        <div className="thirdContact">
          <h2>Live Chat</h2>
          <p>Chat with our expert support team in real-time.</p>
          <span>Available 9 AM - 5 PM (GMT+8)</span>
        </div>
      </div>

      <div className="additionalInfoContainer">
        <div className="emailField">
          <h2>Send Us a Message</h2>
          <p>We're here to help you with any questions or concerns you may have. Please fill out the form below and we'll get back to you as soon as possible.</p>
          
          <div className="formGroup">
            <label>Full Name *</label>
            <input type="text" placeholder="John Doe" />
          </div>
          
          <div className="formGroup">
            <label>Email Address *</label>
            <input type="email" placeholder="xxx@xxx.com" />
          </div>

          <div className="formGroup">
            <label>Company Name *</label>
            <input type="text" placeholder="John Software House Sdn Bhd" />
          </div>

          <div className="formGroup">
            <label htmlFor="subject-select">Subject *</label>
            <select id="subject-select" value={selectedSubject} onChange={handleChange}>
              <option value="generalInquiry">General Inquiry</option>
              <option value="fundingApplication">Funding Application Help</option>
              <option value="technicalSupport">Technical Support</option>
              <option value="partnership">Partnership Opportunities</option>
            </select>
          </div>

          <div className="formGroup">
            <label>Message *</label>
            <textarea placeholder="Please describe your inquiry..." rows="5"></textarea>
          </div>

          <button className="submitButton">Send Message</button>
        </div>
      </div>
    </div>
  );
}

export default Contact;