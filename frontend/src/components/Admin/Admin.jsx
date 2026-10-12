import React, { useState, useEffect } from 'react';
import { Users, Database, ShieldCheck } from 'lucide-react';
import { Bounce, ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AdminDashboard = () => {
  const backend_url = import.meta.env.VITE_BACKEND_URL;
  const [activity, setActivity] = useState({
    lastDay: 0,
    lastWeek: 0,
    lastMonth: 0
  });

  const [storageData, setStorageData] = useState({
    USED: 50,
    FREE: 50
  });

  const [topBuckets, setTopBuckets] = useState([]);
  
  const [securityData, setSecurityData] = useState({
    success: 0,
    failure: 0
  });

  const MAX_STORAGE_GB = 69;

  const getJwtFromCookies = () => {
    const cookies = document.cookie.split(';');
    const jwtCookie = cookies.find(cookie => cookie.trim().startsWith('jwt='));
    return jwtCookie ? jwtCookie.split('=')[1] : null;
  };

  const notify_success = (mess) => {
      toast.success(mess, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
        transition: Bounce,
      });
    };
  
    const notify_error = (mess) => {
      toast.error(mess, {
        position: "top-right",
        autoClose: 3500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
        transition: Bounce,
      });
    };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getJwtFromCookies();
        if (!token) {
          throw new Error('No authentication token found');
        }

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        const activityResponse = await fetch(`${backend_url}/statistics/activity`, {
          headers,
          credentials: 'include'
        });
        if (!activityResponse.ok) {
          throw new Error(`Activity HTTP error! status: ${activityResponse.status}`);
        }
        const activityText = await activityResponse.text();
        if (!activityText) {
          throw new Error('Activity response is empty');
        }
        const activityData = JSON.parse(activityText);
        setActivity(activityData);

        const storageResponse = await fetch(`${backend_url}/statistics/used-storage`, {
          headers,
          credentials: 'include'
        });
        if (!storageResponse.ok) {
          throw new Error(`Storage HTTP error! status: ${storageResponse.status}`);
        }
        const usedBytes = await storageResponse.text();
        console.log(usedBytes);
        if (!usedBytes) {
          throw new Error('Storage response is empty');
        }
        const usedGB = parseInt(usedBytes) / (1024 * 1024);
        const freeGB = MAX_STORAGE_GB - usedGB;
        
        setStorageData({
          USED: ((usedGB / MAX_STORAGE_GB) * 100).toFixed(2),
          FREE: ((freeGB / MAX_STORAGE_GB) * 100).toFixed(2)
        });

        const securityResponse = await fetch(`${backend_url}/statistics/login-status`, {
          headers,
          credentials: 'include'
        });
        if (!securityResponse.ok) {
          throw new Error(`Security HTTP error! status: ${securityResponse.status}`);
        }
        const securityText = await securityResponse.text();
        if (!securityText) {
          throw new Error('Security response is empty');
        }
        const securityData = JSON.parse(securityText);
        setSecurityData(securityData);

        const bucketsResponse = await fetch(`${backend_url}/statistics/top-buckets`, {
          headers,
          credentials: 'include'
        });
        if (!bucketsResponse.ok) {
          throw new Error(`Buckets HTTP error! status: ${bucketsResponse.status}`);
        }
        const bucketsText = await bucketsResponse.text();
        if (!bucketsText) {
          throw new Error('Buckets response is empty');
        }
        const bucketsData = JSON.parse(bucketsText);
        setTopBuckets(bucketsData);

      } catch (error) {
        const errorMessage = error.message;
        notify_error(`Error fetching data: ${errorMessage}`);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const createPieChart = (data) => {
    let currentAngle = 0;
    const total = Object.values(data).reduce((acc, val) => parseFloat(acc) + parseFloat(val), 0);
    const paths = [];

    Object.entries(data).forEach(([key, value]) => {
      const percentage = (parseFloat(value) / total) * 100;
      const angle = (percentage / 100) * 360;
      
      const startX = Math.cos((currentAngle - 90) * (Math.PI / 180)) * 45 + 50;
      const startY = Math.sin((currentAngle - 90) * (Math.PI / 180)) * 45 + 50;
      const endX = Math.cos((currentAngle + angle - 90) * (Math.PI / 180)) * 45 + 50;
      const endY = Math.sin((currentAngle + angle - 90) * (Math.PI / 180)) * 45 + 50;

      const largeArcFlag = angle > 180 ? 1 : 0;

      paths.push({
        path: `M 50 50 L ${startX} ${startY} A 45 45 0 ${largeArcFlag} 1 ${endX} ${endY} Z`,
        color: key === "USED" ? "#FFD700" : "#90EE90",
        id: key
      });

      currentAngle += angle;
    });

    return paths;
  };

  const displayBuckets = [...topBuckets];
  while (displayBuckets.length < 5) {
    displayBuckets.push(`Bucket ${displayBuckets.length + 1}`);
  }

  return (
    <div className="bg-black mt-10 sm:mt-0 h-[95%] rounded-3xl w-[400px] md:w-full h-[95%] p-8 overflow-y-auto scroll6">
      <ToastContainer></ToastContainer>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {/* Activity Section */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-xl p-6 h-full">
            <div className="flex items-center gap-3 mb-8">
              <Users className="text-orange-400" size={24} />
              <h2 className="text-xl font-semibold text-orange-400">Group Activity</h2>
            </div>
            <div className="space-y-6">
              {[
                { key: 'Today', value: activity.lastDay },
                { key: 'Week', value: activity.lastWeek },
                { key: 'Month', value: activity.lastMonth }
              ].map(({ key, value }) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{key}</span>
                    <span className="text-gray-300">{value}</span>
                  </div>
                  <div className="w-full bg-gray-700/50 rounded-full h-2">
                    <div
                      className="bg-orange-400 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${(value / Math.max(activity.lastMonth, 1)) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Storage Usage */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-xl p-6 h-full">
            <div className="flex items-center gap-3 mb-8">
              <Database className="text-orange-400" size={24} />
              <h2 className="text-xl font-semibold text-orange-400">Storage Usage</h2>
            </div>
            <div className="flex flex-col items-center">
              <div className="relative w-48 h-48">
                <svg width="100%" height="100%" viewBox="0 0 100 100">
                  {createPieChart(storageData).map((segment, index) => (
                    <path
                      key={index}
                      d={segment.path}
                      fill={segment.color}
                      stroke="#1F2937"
                      strokeWidth="1"
                    />
                  ))}
                </svg>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6 w-full">
                {Object.entries(storageData).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: key === "USED" ? "#FFD700" : "#90EE90"
                      }}
                    />
                    <span className="text-sm text-gray-400">{`${key} (${value}%)`}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Top Buckets */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-xl p-6 h-full">
            <h2 className="text-xl font-semibold text-orange-400 mb-8">Top Buckets</h2>
            <div className="space-y-6">
              {displayBuckets.map((name, index) => (
                <div key={name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{name}</span>
                    <span className="text-gray-300">
                      {index < topBuckets.length ? 'Active' : 'Empty'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700/50 rounded-full h-2">
                    <div
                      className="bg-orange-400 h-2 rounded-full"
                      style={{ 
                        width: index < topBuckets.length ? '100%' : '0%',
                        opacity: 1 - (index * 0.15)
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="lg:col-span-3">
          <div className="bg-gray-800 rounded-xl p-6 flex flex-col items-center">
            <div className="flex items-center gap-3 mb-8">
              <ShieldCheck className="text-orange-400" size={24} />
              <h2 className="text-xl font-semibold text-orange-400">Security</h2>
            </div>
            <div className="grid grid-cols-2 gap-6 max-w-2xl">
              <div className="bg-gray-700/50 rounded-xl p-6">
                <div className="text-gray-400 mb-2">Successful Logins</div>
                <div className="text-3xl font-semibold text-gray-100">
                  {securityData.success}
                </div>
              </div>
              <div className="bg-gray-700/50 rounded-xl p-6">
                <div className="text-gray-400 mb-2">Failed Logins</div>
                <div className="text-3xl font-semibold text-gray-100">
                  {securityData.failure}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;