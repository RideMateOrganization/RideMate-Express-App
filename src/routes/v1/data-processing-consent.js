import express from 'express';

const router = express.Router();

// Data Processing Consent endpoint
router.get('/', (req, res) => {
  const lastUpdated = new Date().toISOString().split('T')[0];

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ridemate Data Processing Consent</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-radius: 8px;
            margin-top: 20px;
            margin-bottom: 20px;
        }
        
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 30px;
            font-size: 2.5em;
        }
        
        h2 {
            color: #34495e;
            margin-top: 30px;
            margin-bottom: 15px;
            font-size: 1.5em;
            border-left: 4px solid #3498db;
            padding-left: 15px;
        }
        
        h3 {
            color: #2c3e50;
            margin-top: 20px;
            margin-bottom: 10px;
            font-size: 1.2em;
        }
        
        p {
            margin-bottom: 15px;
            text-align: justify;
        }
        
        ul {
            margin-left: 20px;
            margin-bottom: 15px;
        }
        
        li {
            margin-bottom: 8px;
        }
        
        .highlight {
            background-color: #e8f4f8;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #3498db;
            margin: 20px 0;
        }
        
        .contact-info {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
        }
        
        .last-updated {
            font-style: italic;
            color: #7f8c8d;
            text-align: center;
            margin-bottom: 30px;
        }
        
        .section {
            margin-bottom: 30px;
        }
        
        .subsection {
            margin-left: 20px;
            margin-bottom: 20px;
        }
        
        .consent-box {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 20px;
            margin: 20px 0;
        }
        
        @media (max-width: 768px) {
            .container {
                margin: 10px;
                padding: 15px;
            }
            
            h1 {
                font-size: 2em;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Ridemate Data Processing Consent</h1>
        <p class="last-updated">Last Updated: ${lastUpdated}</p>
        
        <div class="section">
            <p>This Data Processing Consent form explains how Ridemate processes your personal data in accordance with the General Data Protection Regulation (GDPR) and other applicable data protection laws.</p>
        </div>

        <div class="consent-box">
            <h2>Your Consent</h2>
            <p>By using our service, you consent to the processing of your personal data as described in this document. You have the right to withdraw your consent at any time by contacting us or through your account settings.</p>
        </div>

        <div class="section">
            <h2>1. Data Controller</h2>
            <p>Ridemate is the data controller for your personal data. We are responsible for ensuring that your personal data is processed in accordance with applicable data protection laws.</p>
        </div>

        <div class="section">
            <h2>2. Types of Personal Data We Process</h2>
            
            <div class="subsection">
                <h3>2.1 Identity Data</h3>
                <ul>
                    <li>Name, email address, and phone number</li>
                    <li>Profile information and photos</li>
                    <li>Government-issued identification (for driver verification)</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>2.2 Location Data</h3>
                <ul>
                    <li>Real-time GPS coordinates during active rides</li>
                    <li>Pickup and destination addresses</li>
                    <li>Route history and travel patterns</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>2.3 Usage Data</h3>
                <ul>
                    <li>Ride history and preferences</li>
                    <li>App usage patterns and interactions</li>
                    <li>Communication logs and support tickets</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>2.4 Technical Data</h3>
                <ul>
                    <li>Device information and identifiers</li>
                    <li>IP addresses and browser information</li>
                    <li>App performance and crash reports</li>
                </ul>
            </div>
        </div>

        <div class="section">
            <h2>3. Legal Basis for Processing</h2>
            
            <div class="subsection">
                <h3>3.1 Contract Performance</h3>
                <p>We process your data to provide our ride-sharing services, including:</p>
                <ul>
                    <li>Matching you with drivers</li>
                    <li>Processing payments</li>
                    <li>Providing customer support</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>3.2 Legitimate Interests</h3>
                <p>We process data for our legitimate business interests, including:</p>
                <ul>
                    <li>Improving our services and user experience</li>
                    <li>Preventing fraud and ensuring safety</li>
                    <li>Conducting analytics and research</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>3.3 Legal Obligations</h3>
                <p>We may process data to comply with legal requirements, including:</p>
                <ul>
                    <li>Tax and regulatory reporting</li>
                    <li>Law enforcement requests</li>
                    <li>Safety investigations</li>
                </ul>
            </div>
        </div>

        <div class="section">
            <h2>4. How We Use Your Data</h2>
            
            <div class="subsection">
                <h3>4.1 Service Provision</h3>
                <ul>
                    <li>Creating and managing your account</li>
                    <li>Processing ride requests and payments</li>
                    <li>Providing real-time tracking and navigation</li>
                    <li>Facilitating communication between users</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>4.2 Safety and Security</h3>
                <ul>
                    <li>Verifying user identity and credentials</li>
                    <li>Monitoring ride safety and quality</li>
                    <li>Investigating incidents and complaints</li>
                    <li>Preventing fraudulent activities</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>4.3 Service Improvement</h3>
                <ul>
                    <li>Analyzing usage patterns and preferences</li>
                    <li>Developing new features and functionality</li>
                    <li>Conducting research and analytics</li>
                    <li>Personalizing your experience</li>
                </ul>
            </div>
        </div>

        <div class="section">
            <h2>5. Data Sharing</h2>
            
            <div class="subsection">
                <h3>5.1 With Other Users</h3>
                <ul>
                    <li>Your name and pickup location (with drivers during rides)</li>
                    <li>Destination information (when ride is confirmed)</li>
                    <li>Contact information for communication</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>5.2 With Service Providers</h3>
                <ul>
                    <li>Payment processors for transaction processing</li>
                    <li>Map and navigation services for routing</li>
                    <li>Communication platforms for notifications</li>
                    <li>Analytics services for app improvement</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>5.3 Legal Requirements</h3>
                <ul>
                    <li>When required by law or legal process</li>
                    <li>To protect our rights and property</li>
                    <li>In case of emergency situations</li>
                    <li>To comply with regulatory requirements</li>
                </ul>
            </div>
        </div>

        <div class="section">
            <h2>6. Data Retention</h2>
            <p>We retain your personal data for as long as necessary to:</p>
            <ul>
                <li>Provide our services to you</li>
                <li>Comply with legal obligations</li>
                <li>Resolve disputes and enforce agreements</li>
                <li>Improve our services (in anonymized form)</li>
            </ul>
            
            <div class="highlight">
                <h3>Retention Periods</h3>
                <ul>
                    <li><strong>Account Data:</strong> Until account deletion + 7 years</li>
                    <li><strong>Ride Data:</strong> 7 years for legal compliance</li>
                    <li><strong>Location Data:</strong> 1 year (unless longer retention required)</li>
                    <li><strong>Communication Data:</strong> 2 years</li>
                </ul>
            </div>
        </div>

        <div class="section">
            <h2>7. Your Rights</h2>
            
            <div class="subsection">
                <h3>7.1 Access and Portability</h3>
                <ul>
                    <li>Request access to your personal data</li>
                    <li>Receive a copy of your data in a portable format</li>
                    <li>Transfer your data to another service</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>7.2 Correction and Deletion</h3>
                <ul>
                    <li>Request correction of inaccurate data</li>
                    <li>Request deletion of your data (right to be forgotten)</li>
                    <li>Object to processing of your data</li>
                </ul>
            </div>

            <div class="subsection">
                <h3>7.3 Restriction and Objection</h3>
                <ul>
                    <li>Request restriction of processing</li>
                    <li>Object to automated decision-making</li>
                    <li>Withdraw consent at any time</li>
                </ul>
            </div>
        </div>

        <div class="section">
            <h2>8. Data Security</h2>
            <p>We implement appropriate technical and organizational measures to protect your personal data:</p>
            <ul>
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security audits and assessments</li>
                <li>Access controls and authentication</li>
                <li>Employee training on data protection</li>
                <li>Incident response procedures</li>
            </ul>
        </div>

        <div class="section">
            <h2>9. International Transfers</h2>
            <p>Your data may be transferred to and processed in countries outside your jurisdiction. We ensure appropriate safeguards are in place for such transfers, including:</p>
            <ul>
                <li>Standard contractual clauses</li>
                <li>Adequacy decisions by relevant authorities</li>
                <li>Certification schemes and codes of conduct</li>
            </ul>
        </div>

        <div class="section">
            <h2>10. Automated Decision Making</h2>
            <p>We may use automated decision-making processes for:</p>
            <ul>
                <li>Matching riders with drivers</li>
                <li>Calculating ride fares</li>
                <li>Assessing safety and fraud risks</li>
            </ul>
            <p>You have the right to request human review of automated decisions that significantly affect you.</p>
        </div>

        <div class="section">
            <h2>11. Children's Data</h2>
            <p>Our service is not intended for children under 16. We do not knowingly collect personal data from children under 16 without parental consent.</p>
        </div>

        <div class="section">
            <h2>12. Changes to This Consent</h2>
            <p>We may update this data processing consent from time to time. We will notify you of any material changes through the app or by email. Your continued use of our service after such changes constitutes acceptance of the updated consent.</p>
        </div>

        <div class="section">
            <h2>13. Contact Information</h2>
            <p>If you have any questions about this data processing consent or wish to exercise your rights, please contact us:</p>
            <ul>
                <li><strong>Data Protection Officer:</strong> dpo@ridemate.com</li>
                <li><strong>General Inquiries:</strong> privacy@ridemate.com</li>
                <li><strong>Address:</strong> Ridemate Data Protection Team, [Your Company Address]</li>
                <li><strong>Phone:</strong> [Your Contact Number]</li>
            </ul>
        </div>

        <div class="consent-box">
            <h2>Consent Confirmation</h2>
            <p>By accepting this data processing consent, you acknowledge that you have read, understood, and agree to the processing of your personal data as described above.</p>
            <p><strong>You can withdraw your consent at any time by contacting us or through your account settings.</strong></p>
        </div>
    </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

export default router;
