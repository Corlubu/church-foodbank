// frontend/src/pages/StaffDashboard.jsx
import { useNavigate } from 'react-router-dom';
import ManualCitizenForm from '../components/ManualCitizenForm';

export default function StaffDashboard() {
  const navigate = useNavigate();

  return (
    <ManualCitizenForm
      // Pass a function to go back to the main scan page
      onBack={() => navigate('/staff/scan')}
    />
  );
}
