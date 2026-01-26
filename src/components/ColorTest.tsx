import React from 'react';

export const ColorTest: React.FC = () => {
  return (
    <div className="min-h-screen bg-background-light p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-info-dark mb-8 text-center">
          ⚡ Nexus Design System
        </h1>

        {/* Quick Visual Test */}
        <div className="mb-8 p-6 bg-white rounded-xl shadow-xl">
          <h2 className="text-2xl font-semibold text-info-dark mb-4">🧪 Quick Style Test</h2>
          <p className="text-text-dark mb-4">
            If you can see proper colors and styling below, the Nexus theme is working!
          </p>
          <div className="flex gap-4 flex-wrap">
            <button className="btn-primary">Primary Action</button>
            <button className="btn-secondary">Secondary</button>
            <button className="btn-accent">Accent</button>
          </div>
        </div>

        {/* Primary Colors - Electric Blue */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-info-dark mb-4">Primary - Electric Blue</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-primary-50 p-4 rounded-lg text-primary-950 font-medium">
              50 - Very Light
            </div>
            <div className="bg-primary-100 p-4 rounded-lg text-primary-950 font-medium">
              100 - Light
            </div>
            <div className="bg-primary-300 p-4 rounded-lg text-white font-medium">
              300 - Medium Light
            </div>
            <div className="bg-primary-500 p-4 rounded-lg text-white font-medium">
              500 - Primary
            </div>
            <div className="bg-primary-600 p-4 rounded-lg text-white font-medium">600 - Dark</div>
            <div className="bg-primary-700 p-4 rounded-lg text-white font-medium">700 - Deep</div>
            <div className="bg-primary-800 p-4 rounded-lg text-white font-medium">
              800 - Very Dark
            </div>
            <div className="bg-primary-900 p-4 rounded-lg text-white font-medium">
              900 - Almost Black
            </div>
          </div>
        </section>

        {/* Secondary Colors - Electric Cyan */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-info-dark mb-4">
            Secondary - Electric Cyan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-secondary-50 p-4 rounded-lg text-secondary-950 font-medium">
              50 - Very Light
            </div>
            <div className="bg-secondary-200 p-4 rounded-lg text-secondary-950 font-medium">
              200 - Pale
            </div>
            <div className="bg-secondary-400 p-4 rounded-lg text-white font-medium">
              400 - Medium
            </div>
            <div className="bg-secondary-500 p-4 rounded-lg text-white font-medium">
              500 - Cyan
            </div>
            <div className="bg-secondary-600 p-4 rounded-lg text-white font-medium">
              600 - Dark Cyan
            </div>
            <div className="bg-secondary-800 p-4 rounded-lg text-white font-medium">
              800 - Deeper
            </div>
            <div className="bg-secondary-900 p-4 rounded-lg text-white font-medium">
              900 - Very Dark
            </div>
          </div>
        </section>

        {/* Tertiary Colors - Electric Violet */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-info-dark mb-4">Tertiary - Electric Violet</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-tertiary-100 p-4 rounded-lg text-tertiary-950 font-medium">
              100 - Light Violet
            </div>
            <div className="bg-tertiary-300 p-4 rounded-lg text-white font-medium">
              300 - Light Medium
            </div>
            <div className="bg-tertiary-500 p-4 rounded-lg text-white font-medium">
              500 - Electric Violet
            </div>
            <div className="bg-tertiary-600 p-4 rounded-lg text-white font-medium">
              600 - Dark Violet
            </div>
            <div className="bg-tertiary-700 p-4 rounded-lg text-white font-medium">
              700 - Deeper
            </div>
            <div className="bg-tertiary-900 p-4 rounded-lg text-white font-medium">
              900 - Almost Black
            </div>
          </div>
        </section>

        {/* Accent Colors - Electric Green */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-info-dark mb-4">Accent - Electric Green</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-accent-50 p-4 rounded-lg text-accent-950 font-medium">
              50 - Very Light
            </div>
            <div className="bg-accent-200 p-4 rounded-lg text-accent-950 font-medium">
              200 - Pale Green
            </div>
            <div className="bg-accent-400 p-4 rounded-lg text-white font-medium">
              400 - Medium Green
            </div>
            <div className="bg-accent-500 p-4 rounded-lg text-white font-medium">
              500 - Electric Green
            </div>
            <div className="bg-accent-700 p-4 rounded-lg text-white font-medium">
              700 - Deeper Green
            </div>
            <div className="bg-accent-800 p-4 rounded-lg text-white font-medium">
              800 - Very Dark
            </div>
          </div>
        </section>

        {/* Component Examples */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-info-dark mb-4">Component Examples</h2>
          <div className="space-y-6">
            {/* Buttons */}
            <div>
              <h3 className="text-lg font-medium text-info-dark mb-3">Buttons</h3>
              <div className="flex flex-wrap gap-4">
                <button className="btn-primary">Primary Button</button>
                <button className="btn-secondary">Secondary Button</button>
                <button className="btn-accent">Accent Button</button>
              </div>
            </div>

            {/* Cards */}
            <div>
              <h3 className="text-lg font-medium text-info-dark mb-3">Cards</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card-nexus">
                  <div className="card-header-nexus">
                    <h4 className="font-semibold text-info-dark">User Dashboard</h4>
                  </div>
                  <div className="card-body-nexus">
                    <p className="text-text-dark">
                      Manage user information with our secure platform.
                    </p>
                  </div>
                  <div className="card-footer-nexus">
                    <button className="btn-primary text-sm">View Details</button>
                  </div>
                </div>

                <div className="card-nexus">
                  <div className="card-header-nexus">
                    <h4 className="font-semibold text-info-dark">Address Book</h4>
                  </div>
                  <div className="card-body-nexus">
                    <p className="text-text-dark">
                      Comprehensive contact management for your organization.
                    </p>
                  </div>
                  <div className="card-footer-nexus">
                    <button className="btn-accent text-sm">Manage Contacts</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Elements */}
            <div>
              <h3 className="text-lg font-medium text-info-dark mb-3">Form Elements</h3>
              <div className="max-w-md">
                <label className="form-label-nexus">Full Name</label>
                <input
                  type="text"
                  className="form-input-nexus"
                  placeholder="Enter full name"
                />

                <label className="form-label-nexus">Email Address</label>
                <input
                  type="email"
                  className="form-input-nexus"
                  placeholder="user@example.com"
                />

                <div className="mt-4">
                  <button className="btn-primary mr-3">Save</button>
                  <button className="btn-secondary">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Background Examples */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-info-dark mb-4">Background Themes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg bg-info-light">
              <h3 className="text-info-dark font-semibold mb-2">Info Theme</h3>
              <p className="text-info-dark/80">
                Cyan background representing information and positive actions.
              </p>
            </div>

            <div className="p-6 rounded-lg bg-background-light">
              <h3 className="text-text-dark font-semibold mb-2">Background Theme</h3>
              <p className="text-text-dark/80">
                Light blue-gray background for general layouts.
              </p>
            </div>

            <div className="p-6 rounded-lg bg-success-light">
              <h3 className="font-semibold mb-2" style={{ color: 'var(--color-success-dark)' }}>
                Success Theme
              </h3>
              <p style={{ color: 'var(--color-success-dark)' }}>
                Light lime background representing success and growth.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
