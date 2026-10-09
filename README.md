# Haven Bookings

Build a complete, production-ready premium website and booking management system for a small, newly established B&B in Kenya.

IMPORTANT:
- Do NOT use hardcoded business data.
- Create the system so the B&B owner can manage rooms, prices, availability, bookings, photos and other content from an admin dashboard.
- Use Supabase as the backend/database.
- I will use MY OWN Supabase project, not Lovable's Supabase.
- Do not create or connect to a different Supabase project.
- Do not expose Supabase service-role keys or payment credentials in frontend code.
- Provide all required SQL migrations/schema in a separate `docs/database.sql` file so I can run them manually in my Supabase SQL Editor.
- Also create `docs/setup.md` explaining exactly how to configure the project.
- Do not invent real business information. Use clearly labelled editable placeholder content until I provide the actual B&B information.

M-Pesa payment flow:
- Implement STK Push with manual fallback: attempt an automated Daraja STK push prompt first, but provide a clear fallback where guests can pay manually via Paybill / Till Number and input their M-Pesa confirmation receipt code if the prompt times out or fails.

==================================================
1. BRAND / BUSINESS
==================================================

Business name:
[INSERT B&B NAME]

Location:
[INSERT LOCATION]

Country:
Kenya

The design should feel like a beautiful, trustworthy and modern boutique B&B.

The website should communicate:
- Comfort
- Cleanliness
- Hospitality
- Safety
- Convenience
- Affordable luxury

Avoid making it look like a generic hotel template.

==================================================
2. VISUAL DESIGN
==================================================

Create a premium hospitality design.

Style:
- Elegant
- Modern
- Warm
- Minimal
- Professional
- Image-focused
- Excellent typography
- Generous whitespace
- Subtle animations
- Premium but appropriate for a small B&B

Use high-quality placeholder imagery where necessary, but make all images replaceable through the admin dashboard.

The website must be exceptionally good on mobile because many guests will visit from their phones.

Use:
- Responsive layouts
- Smooth transitions
- Modern cards
- Beautiful room galleries
- Sticky navigation
- Clear calls-to-action
- Strong visual hierarchy

Primary CTAs:
- Book Your Stay
- Check Availability
- View Rooms
- Contact Us

==================================================
3. PUBLIC WEBSITE
==================================================

Create these pages:

/
/rooms
/rooms/[room]
/booking
/about
/gallery
/contact
/booking/success
/booking/cancelled

Also create proper 404 handling.

--------------------------------------------------
HOME PAGE
--------------------------------------------------

Hero section:
- Large beautiful B&B image
- Business name
- Short headline
- Short description
- "Book Your Stay" CTA
- "View Rooms" CTA

Add a booking/search widget directly below or overlapping the hero:

- Check-in
- Check-out
- Number of guests
- Search availability

Then include:

- Featured rooms
- Why stay with us
- B&B amenities
- Photo gallery preview
- Location section
- Guest testimonials
- Booking CTA
- Contact information
- Footer

--------------------------------------------------
ROOMS PAGE
--------------------------------------------------

Display all rooms dynamically from Supabase.

Each room should show:
- Room name
- Main image
- Short description
- Price per night
- Maximum guests
- Amenities
- Availability status
- View Room button
- Book Now button

Filters:
- Price
- Number of guests
- Room type
- Availability

--------------------------------------------------
ROOM DETAILS
--------------------------------------------------

Each room should have:

- Large image gallery
- Room name
- Description
- Price per night
- Maximum occupancy
- Bed type
- Amenities
- Room facilities
- Availability calendar
- Check-in/check-out selector
- Guest selector
- Total price calculation
- Book Now button

Do NOT allow users to book dates that are already unavailable.

==================================================
4. BOOKING SYSTEM
==================================================

Build a real booking system.

Guests should be able to:

1. Select check-in date
2. Select check-out date
3. Select number of guests
4. View available rooms
5. Select a particular room
6. Enter guest information
7. Review booking
8. Pay online
9. Receive booking confirmation

Guest information:

- Full name
- Email
- Phone number
- Number of guests
- Special requests

Booking should generate a unique booking reference.

Example:

B&B-2026-0001

The booking system must prevent double-booking.

Availability must be calculated from actual booking records in Supabase.

Booking statuses:

- Pending
- Confirmed
- Checked In
- Checked Out
- Cancelled
- No Show

==================================================
5. PAYMENT SYSTEM
==================================================

Design the system to support online payments suitable for Kenya.

Primary payment method:
M-Pesa

Also structure the payment system so card/other payment providers can be added later.

IMPORTANT:
Do not hardcode API credentials.

Create secure server-side/API integration architecture.

Payment flow:

Guest selects room
→ selects dates
→ booking created as pending
→ payment initiated
→ payment confirmed
→ booking becomes confirmed
→ guest receives confirmation

Store:

- Payment reference
- Amount
- Currency
- Payment status
- Payment method
- Booking ID
- Transaction date

Currency:
KES

For the M-Pesa integration, create the necessary backend structure and clearly document where the actual Daraja/API credentials will be configured.

Do not pretend that payments are functional if credentials have not yet been supplied.

==================================================
6. AUTOMATIC CONFIRMATIONS
==================================================

After successful booking/payment:

Send a booking confirmation email.

The confirmation should contain:

- Guest name
- B&B name
- Booking reference
- Room
- Check-in date
- Check-out date
- Number of guests
- Amount paid
- Remaining balance if applicable
- Contact information
- Location

Also create a WhatsApp contact option.

Structure the notification system so WhatsApp/SMS notifications can be added without rebuilding the booking system.

==================================================
7. ADMIN DASHBOARD
==================================================

Create a separate protected admin dashboard.

Route:

/admin

The admin dashboard should NOT be publicly accessible.

Include:

Dashboard
- Today's bookings
- Upcoming bookings
- Current guests
- Revenue
- Occupancy overview
- Pending bookings

Bookings:
- View all bookings
- Search bookings
- Filter by status
- Filter by date
- Open booking details
- Confirm/cancel bookings
- Check guests in
- Check guests out
- Update booking status

Rooms:
- Add room
- Edit room
- Delete/deactivate room
- Set room price
- Set maximum guests
- Add amenities
- Upload photos
- Set room description
- Mark room available/unavailable

Availability:
- Calendar view
- View bookings
- Block dates
- Unblock dates
- Manually mark rooms unavailable

Customers:
- View guest information
- View booking history

Payments:
- View transactions
- Payment status
- Payment reference
- Amount
- Booking associated with payment

Analytics:
- Total bookings
- Revenue
- Occupancy
- Popular rooms
- Booking trends

==================================================
8. CONTENT MANAGEMENT
==================================================

The owner should be able to manage:

- B&B name
- Logo
- Hero image
- About text
- Contact details
- Phone number
- Email
- WhatsApp number
- Address
- Google Maps location
- Social media links
- Amenities
- Gallery images
- Testimonials
- Check-in time
- Check-out time
- Cancellation policy

Do not hardcode these values.

==================================================
9. DATABASE
==================================================

Design a proper relational Supabase/PostgreSQL database.

At minimum include tables for:

- profiles/admin users
- rooms
- room_images
- amenities
- room_amenities
- bookings
- booking_guests
- payments
- availability_blocks
- testimonials
- gallery
- site_settings

Use proper:
- Primary keys
- Foreign keys
- Indexes
- Constraints
- Timestamps
- Status fields

Implement Row Level Security appropriately.

Guests should only be able to access the booking information necessary for their booking process.

Admin functionality must be protected.

==================================================
10. SEO
==================================================

Implement strong basic SEO.

Include:

- Proper page titles
- Meta descriptions
- Open Graph metadata
- Semantic HTML
- Clean URLs
- Sitemap
- Robots.txt
- Structured data/schema markup for accommodation
- Local SEO information

Optimize the website for searches such as:

"B&B in [location]"
"accommodation in [location]"
"guest house in [location]"
"rooms in [location]"

Do not guarantee Google rankings.

==================================================
11. GOOGLE BUSINESS PROFILE
==================================================

Prepare the website for integration with Google Business Profile.

Include:
- Correct business information structure
- Address
- Phone
- Opening/check-in information
- Google Maps
- LocalBusiness/Hotel schema where appropriate

==================================================
12. WHATSAPP
==================================================

Add WhatsApp buttons throughout the website.

The number must come from the database/site settings rather than being hardcoded.

Allow users to contact the B&B directly through WhatsApp.

For booking inquiries, generate a useful pre-filled WhatsApp message containing relevant booking information where appropriate.

==================================================
13. SECURITY
==================================================

Implement proper security practices.

- Protected admin routes
- Supabase authentication
- Row Level Security
- Secure API handling
- No exposed secret keys
- Server-side payment processing
- Input validation
- Form validation
- Protection against duplicate bookings
- Proper error handling

==================================================
14. MOBILE EXPERIENCE
==================================================

Mobile is extremely important.

Make sure:

- Booking works perfectly on mobile
- Room galleries work well
- Buttons are easy to tap
- Navigation is mobile friendly
- Booking forms are simple
- Admin dashboard is responsive
- No horizontal scrolling
- Fast loading

==================================================
15. PERFORMANCE
==================================================

Optimize:

- Images
- Lazy loading
- Code splitting
- API/database queries
- Mobile performance

Avoid unnecessary libraries and unnecessary animations.

==================================================
16. ERROR / EMPTY STATES
==================================================

Create polished states for:

- No rooms available
- No bookings
- Payment failed
- Booking failed
- Invalid dates
- Room unavailable
- Network error
- Empty gallery
- Empty testimonials
- Loading states

Never show raw errors to users.

==================================================
17. IMPORTANT BUSINESS RULES
==================================================

Check-out must always be after check-in.

Prevent overlapping confirmed bookings for the same room.

Calculate the number of nights automatically.

Example:

Check-in: 10 June
Check-out: 13 June
Total nights: 3

Total price:

Nightly rate × number of nights

Allow the owner to change room prices from the admin dashboard.

The booking system must always use the current database price rather than a frontend hardcoded price.

==================================================
18. DOCUMENTATION
==================================================

Create:

/docs/database.sql
/docs/setup.md
/docs/payment-setup.md
/docs/admin-guide.md

database.sql:
Include the complete database schema, indexes, RLS policies and required functions/triggers.

setup.md:
Explain:
- Supabase setup
- Environment variables
- Database setup
- Authentication setup
- Storage setup
- Deployment

payment-setup.md:
Explain exactly where and how payment credentials will be configured.

admin-guide.md:
Explain how the B&B owner manages:
- Rooms
- Prices
- Availability
- Bookings
- Payments
- Gallery
- Testimonials
- Site settings

==================================================
19. NO FAKE FUNCTIONALITY
==================================================

This is extremely important.

Do not create buttons that appear functional but do nothing.

If a feature requires external credentials/API keys that have not yet been supplied, build the integration architecture and clearly document what remains to be configured.

Do not claim that M-Pesa payments, emails or external services are fully live until their required credentials/configuration are actually provided.

==================================================
20. FINAL QUALITY
==================================================

The final result should feel like a real commercial B&B website that could be launched for paying guests.

It should NOT look like:
- A generic AI-generated template
- A student project
- A basic landing page
- A fake hotel website

It should feel:
- Professional
- Trustworthy
- Beautiful
- Fast
- Easy to book
- Easy for the owner to manage

Build the complete frontend, backend structure, database integration, authentication, booking system, admin dashboard and documentation.

Before finishing, test the complete booking flow and make sure there are no obvious broken buttons, routes, forms or database errors.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9d98ba45-69dd-4c43-a004-5bb03b801ecc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
