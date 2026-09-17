const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '../screens/dashboard/BookerDashboardPage.js');
const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
const start = 1684;
const end = 2122;

const replacement = `        {activeSection === 'profil' ? (
          <BookerProfilSection
            language={language}
            styles={styles}
            loadingProfile={loadingProfile}
            bookerProfile={bookerProfile}
            profileImage={profileImage}
            profileForm={profileForm}
            setProfileForm={setProfileForm}
            uploadingProfileImage={uploadingProfileImage}
            pickProfileImage={pickProfileImage}
            savingProfile={savingProfile}
            saveBookerProfile={saveBookerProfile}
          />
        ) : activeSection === 'events' ? (
          <BookerEventsSection
            language={language}
            styles={styles}
            navigate={navigate}
            myEvents={myEvents}
            loadingEvents={loadingEvents}
            pulseEventId={pulseEventId}
            openVenueChat={openVenueChat}
            openPrestataireChat={openPrestataireChat}
            openGroupChat={openGroupChat}
            openChat={openChat}
            markBookingAsPaid={markBookingAsPaid}
            markingPaymentEventDjId={markingPaymentEventDjId}
            openEditEvent={openEditEvent}
            handlePublishToFeed={handlePublishToFeed}
            publishingEventId={publishingEventId}
            handleDeleteEvent={handleDeleteEvent}
            deletingEventId={deletingEventId}
          />
        ) : null}`.split('\n');

const out = [...lines.slice(0, start), ...replacement, ...lines.slice(end)];
fs.writeFileSync(p, out.join('\n'));
console.log('lines now', out.length);
