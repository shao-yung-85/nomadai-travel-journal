import React, { useState } from 'react';
import { Trip, Flight, AppSettings } from '../types';
import { translations } from '../utils/translations';
import { TrashIcon, PlaneIcon, TicketIcon } from './Icons';

interface TripBookingsProps {
    trip: Trip;
    settings: AppSettings;
    onUpdateTrip?: (trip: Trip) => void;
}

const TripBookings: React.FC<TripBookingsProps> = ({ trip, settings, onUpdateTrip }) => {
    const t = translations[settings.language] || translations['zh-TW'];

    const [isAddingBooking, setIsAddingBooking] = useState(false);
    const [newBookingType, setNewBookingType] = useState<'FLIGHT' | 'HOTEL' | 'TRAIN'>('FLIGHT');
    const [newBookingProvider, setNewBookingProvider] = useState('');
    const [newBookingRef, setNewBookingRef] = useState('');
    const [newBookingOrigin, setNewBookingOrigin] = useState('');
    const [newBookingDest, setNewBookingDest] = useState('');
    const [newBookingDate, setNewBookingDate] = useState('');
    const [newBookingTime, setNewBookingTime] = useState('');

    const handleAddBooking = () => {
        if (!newBookingProvider) return;

        const newBooking: Flight = {
            id: Date.now().toString(),
            type: newBookingType,
            airline: newBookingProvider,
            number: newBookingRef || 'N/A',
            origin: newBookingOrigin || '-',
            destination: newBookingDest || '-',
            departureTime: newBookingDate ? `${newBookingDate} ${newBookingTime}` : newBookingTime || '00:00',
            arrivalTime: '-',
            status: 'Confirmed',
            bookingUrl: ''
        };

        const updatedBookings = [newBooking, ...(trip.bookings || [])];
        onUpdateTrip?.({ ...trip, bookings: updatedBookings });

        setNewBookingProvider('');
        setNewBookingRef('');
        setNewBookingOrigin('');
        setNewBookingDest('');
        setNewBookingDate('');
        setNewBookingTime('');
        setIsAddingBooking(false);
    };

    const handleDeleteBooking = (bookingId: string) => {
        if (confirm(t.delete_trip_confirm.replace('{title}', t.bookings))) {
            const currentBookings = trip.bookings || [];
            const updatedBookings = currentBookings.filter(b => b.id !== bookingId);
            onUpdateTrip?.({ ...trip, bookings: updatedBookings });
        }
    };

    return (
        <div className="pb-32">
            <div className="space-y-4">
                {trip.bookings?.map((booking) => (
                    <div key={booking.id} className="bg-white p-5 rounded-2xl shadow-sm border border-sand relative group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
                                    {booking.type === 'FLIGHT' ? <PlaneIcon className="w-5 h-5" /> : <TicketIcon className="w-5 h-5" />}
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        {booking.type === 'FLIGHT' ? t.booking_type_flight :
                                            booking.type === 'HOTEL' ? t.booking_type_hotel :
                                                booking.type === 'TRAIN' ? t.booking_type_train : booking.type}
                                    </span>
                                    <h4 className="font-bold text-ink text-lg">{booking.airline}</h4>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${booking.status === 'Confirmed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                    {booking.status}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <p className="text-xs text-gray-400 font-bold mb-1">{t.label_departure || 'DEPARTURE'}</p>
                                <p className="text-ink font-bold text-lg">{booking.origin}</p>
                                <p className="text-sm text-gray-500">{booking.departureTime}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400 font-bold mb-1">{t.label_arrival || 'ARRIVAL'}</p>
                                <p className="text-ink font-bold text-lg">{booking.destination}</p>
                                <p className="text-sm text-gray-500">{booking.arrivalTime}</p>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-sand flex justify-between items-center">
                            <div className="text-xs text-gray-400 font-mono">
                                {t.label_ref || 'REF'}: <span className="text-ink font-bold">{booking.number}</span>
                            </div>
                            <button
                                onClick={() => handleDeleteBooking(booking.id)}
                                className="text-gray-300 hover:text-red-500 transition-colors"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
                {(!trip.bookings || trip.bookings.length === 0) && (
                    <div className="text-center py-10 text-gray-400 text-sm font-medium">
                        {t.no_bookings}
                    </div>
                )}
            </div>

            {/* Add Booking Modal */}
            {isAddingBooking && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={() => setIsAddingBooking(false)}>
                    <div className="bg-paper w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-ink mb-6 text-center">{t.add_booking}</h3>
                        <div className="space-y-4">
                            <div className="flex bg-white rounded-xl p-1 shadow-sm mb-4">
                                {['FLIGHT', 'HOTEL', 'TRAIN'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setNewBookingType(type as any)}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newBookingType === type ? 'bg-ink text-white shadow-sm' : 'text-gray-400 hover:text-ink'}`}
                                    >
                                        {type === 'FLIGHT' ? t.booking_type_flight :
                                            type === 'HOTEL' ? t.booking_type_hotel :
                                                type === 'TRAIN' ? t.booking_type_train : type}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 ml-1">{t.provider}</label>
                                <input
                                    value={newBookingProvider}
                                    onChange={(e) => setNewBookingProvider(e.target.value)}
                                    placeholder={t.placeholder_provider}
                                    className="w-full bg-white p-4 rounded-xl text-base font-bold border-none shadow-sm outline-none"
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 ml-1">{t.ref_number}</label>
                                    <input
                                        value={newBookingRef}
                                        onChange={(e) => setNewBookingRef(e.target.value)}
                                        placeholder={t.placeholder_pnr}
                                        className="w-full bg-white p-3 rounded-xl text-sm font-bold border-none shadow-sm outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 ml-1">{t.date}</label>
                                    <input
                                        type="date"
                                        value={newBookingDate}
                                        onChange={(e) => setNewBookingDate(e.target.value)}
                                        className="w-full bg-white p-3 rounded-xl text-sm font-bold border-none shadow-sm outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 ml-1">{t.origin}</label>
                                    <input
                                        value={newBookingOrigin}
                                        onChange={(e) => setNewBookingOrigin(e.target.value)}
                                        placeholder={t.placeholder_origin}
                                        className="w-full bg-white p-3 rounded-xl text-sm font-bold border-none shadow-sm outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 ml-1">{t.label_destination}</label>
                                    <input
                                        value={newBookingDest}
                                        onChange={(e) => setNewBookingDest(e.target.value)}
                                        placeholder={t.placeholder_dest}
                                        className="w-full bg-white p-3 rounded-xl text-sm font-bold border-none shadow-sm outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleAddBooking}
                                disabled={!newBookingProvider}
                                className="w-full bg-coral text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-coral/30 mt-4 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
                            >
                                {t.confirm}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Booking FAB */}
            <button
                onClick={() => setIsAddingBooking(true)}
                className="fixed bottom-24 right-6 w-14 h-14 bg-blue-500 text-white rounded-full shadow-xl shadow-blue-500/40 flex items-center justify-center z-30 hover:scale-105 active:scale-95 transition-all"
            >
                <span className="text-3xl font-light mb-1">+</span>
            </button>
        </div>
    );
};

export default TripBookings;
