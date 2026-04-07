export default function PoliciesPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-yellow-500 mb-4">
          Policies & Terms
        </h1>

        <p className="text-gray-300 mb-10 max-w-3xl">
          Please review our service policies, payment terms, charges, and
          operating standards. These policies are in place to protect our
          clients, installers, scheduling, and project workflow.
        </p>

        <div className="space-y-8">
          {/* Client Policies */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold text-yellow-500 mb-4">
              Client Policies
            </h2>

            <div className="space-y-3 text-gray-300">
              <p>• Minimum service charge: $210</p>

              <p>
                • Waste trip charge: $210 may apply if our crew arrives and the
                job cannot proceed due to site conditions, lack of access,
                client-side delays, or the site not being ready.
              </p>

              <p>
                • 24-hour cancellation charge: $150 may apply for cancellations
                made within 24 hours of the scheduled booking.
              </p>

              <p>
                • Waiting time policy: The first 20 minutes on-site is free.
                After that, a charge of $50 per additional 20 minutes will
                apply if installers are delayed due to client or jobsite
                readiness.
              </p>

              <p>
                • Final pricing may change based on confirmed site conditions,
                selected add-on services, job complexity, access issues, and
                project requirements.
              </p>

              <p>
                • Clients must provide accurate job details, measurements,
                service requirements, and addresses before installation.
              </p>

              <p>
                • Clients must ensure safe and clear access to the installation
                area before the crew arrives.
              </p>

              <p>
                • Additional services requested on-site that were not included
                in the original quote may be billed separately.
              </p>

              <p>
                • Booking dates and times are subject to confirmation and
                availability.
              </p>

              <p>
                • Payment terms: Payment is due as agreed at checkout or upon
                completion of the service, unless otherwise specified in writing.
              </p>

              <p>
                • Late payment: Any unpaid balance beyond the agreed payment
                time may be subject to additional fees, service holds, or
                collection action.
              </p>

              <p>
                • Non-payment: 1-800TOPS reserves the right to suspend service,
                pursue collections, or take legal action for unpaid invoices.
              </p>

              <p>
                • Deposits: Deposits may be required to confirm and secure
                booking dates and scheduling.
              </p>

              <p>
                • Disputes: Any service-related concern or dispute must be
                reported promptly after service completion for review.
              </p>

              <p>
                • All services provided are subject to final site inspection and
                approval.
              </p>

              <p>
                • By proceeding with booking, the client agrees to all terms,
                pricing, and policies listed.
              </p>
            </div>
          </section>

          {/* Installer Policies */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold text-yellow-500 mb-4">
              Installer Policies
            </h2>

            <div className="space-y-3 text-gray-300">
              <p>• All installers must be fully insured.</p>

              <p>
                • All installers must follow proper safety procedures and safe
                work practices at all times.
              </p>

              <p>
                • Installers are responsible for the quality of their
                workmanship and on-site conduct.
              </p>

              <p>
                • Any verified damage caused directly during installation must
                be reported immediately and handled according to company policy.
              </p>

              <p>
                • Installers must protect surrounding areas, finished surfaces,
                materials, and jobsite access points where required.
              </p>

              <p>
                • Installers must arrive on time, communicate delays, and keep
                job progress updated when necessary.
              </p>

              <p>
                • Installers must complete work in a professional manner and
                follow company standards for clean-up and final inspection.
              </p>

              <p>
                • Installers must not begin unapproved extra work without client
                or company authorization.
              </p>

              <p>
                • Installers are accountable for following company procedures,
                service standards, and approved job scope.
              </p>

              <p>
                • All installers are responsible for any damage directly caused
                by their work, subject to jobsite review and verification.
              </p>
            </div>
          </section>

          {/* Standard Charges */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold text-yellow-500 mb-4">
              Standard Charges & Service Notes
            </h2>

            <div className="space-y-3 text-gray-300">
              <p>• Same Day Timeline Charge: $210</p>
              <p>• Next Day Timeline Charge: $150</p>
              <p>• Scheduled Booking Charge: $0</p>
              <p>• 2cm Material Rate: $9 per sqft</p>
              <p>• 3cm Material Rate: $10 per sqft</p>
              <p>• Tile Rate: $30 per sqft</p>
            </div>
          </section>

          {/* Add-On Services */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold text-yellow-500 mb-4">
              Add-On Services
            </h2>

            <div className="grid md:grid-cols-2 gap-3 text-gray-300">
              <p>• Extra Cutting — $175</p>
              <p>• Small Polishing — $80</p>
              <p>• Big Polishing — $175</p>
              <p>• Sink Cutout — $175</p>
              <p>• Waterfall — $100</p>
              <p>• Extra Helper Needed — $200</p>
              <p>• Outlet Plug Cutout — $50</p>
              <p>• Granite / Marble Sealing — $50</p>
              <p>• Cooktop Cutout — $175</p>
              <p>• Condo / High-Rise — $80</p>
              <p>• Difficult / Stairs 7+ / Basement — $180</p>
              <p>• Plumbing Service — Price to be confirmed</p>
              <p>• Remove and Dispose Laminate — $175</p>
              <p>• Remove and Dispose Stone — $325</p>
              <p>• Removal — $60</p>
              <p>• Full Countertop Template — $300</p>
              <p>• Remeasure Backsplash - Full Height — $180</p>
              <p>• Remeasure Backsplash - Low Height — $80</p>
              <p>• Vanity Removal — $120</p>
              <p>• Backsplash Tile Removal — $300</p>
            </div>
          </section>

          {/* Contact */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold text-yellow-500 mb-4">
              Contact
            </h2>

            <div className="space-y-3 text-gray-300">
              <p>• Phone: +1 647-795-4392</p>
              <p>• Email: Coming Soon</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}