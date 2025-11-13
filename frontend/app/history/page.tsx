"use client";

import { useState, useEffect } from "react";
import { fetchDetectionshistory } from "@/app/api";
import type { DetectionItem } from "@/app/type";

export default function HistoryPage() {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  
  // ข้อมูลทั้งหมด (ก่อน filter)
  const [allOffenceDetections, setAllOffenceDetections] = useState<DetectionItem[]>([]);
  const [allDefenceDetections, setAllDefenceDetections] = useState<DetectionItem[]>([]);
  
  // ข้อมูลที่ filter แล้ว
  const [filteredOffenceDetections, setFilteredOffenceDetections] = useState<DetectionItem[]>([]);
  const [filteredDefenceDetections, setFilteredDefenceDetections] = useState<DetectionItem[]>([]);
  
  const [isLoadingOffence, setIsLoadingOffence] = useState(false);
  const [isLoadingDefence, setIsLoadingDefence] = useState(false);
  const [errorMsgOffence, setErrorMsgOffence] = useState<string | null>(null);
  const [errorMsgDefence, setErrorMsgDefence] = useState<string | null>(null);
  
  const [currentPageOffence, setCurrentPageOffence] = useState(1);
  const [currentPageDefence, setCurrentPageDefence] = useState(1);

  const offCamId = process.env.NEXT_PUBLIC_OFF_CAM || "";
  const offToken = process.env.NEXT_PUBLIC_OFF_TOKEN || "";
  const defCamId = process.env.NEXT_PUBLIC_DEF_CAM || "";
  const defToken = process.env.NEXT_PUBLIC_DEF_TOKEN || "";

  const itemsPerPage = 10;
  
  // Offence pagination
  const totalPagesOffence = Math.ceil(filteredOffenceDetections.length / itemsPerPage);
  const startIndexOffence = (currentPageOffence - 1) * itemsPerPage;
  const endIndexOffence = startIndexOffence + itemsPerPage;
  const currentOffenceDetections = filteredOffenceDetections.slice(startIndexOffence, endIndexOffence);
  
  // Defence pagination
  const totalPagesDefence = Math.ceil(filteredDefenceDetections.length / itemsPerPage);
  const startIndexDefence = (currentPageDefence - 1) * itemsPerPage;
  const endIndexDefence = startIndexDefence + itemsPerPage;
  const currentDefenceDetections = filteredDefenceDetections.slice(startIndexDefence, endIndexDefence);

  // ✅ ฟังก์ชันสร้าง array ของหน้า pagination
  const getPaginationPages = (currentPage: number, totalPages: number) => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = new Set<number>();
    pages.add(1);
    pages.add(2);
    
    if (currentPage > 2 && currentPage < totalPages - 1) {
      pages.add(currentPage - 1);
      pages.add(currentPage);
      pages.add(currentPage + 1);
    } else if (currentPage === 3) {
      pages.add(3);
      pages.add(4);
    } else if (currentPage === totalPages - 2) {
      pages.add(totalPages - 3);
      pages.add(totalPages - 2);
    }
    
    pages.add(totalPages - 1);
    pages.add(totalPages);
    
    const sortedPages = Array.from(pages).sort((a, b) => a - b);
    const result: (number | string)[] = [];
    
    for (let i = 0; i < sortedPages.length; i++) {
      const page = sortedPages[i];
      const prevPage = sortedPages[i - 1];
      
      if (prevPage && page - prevPage > 1) {
        result.push("...");
      }
      
      result.push(page);
    }
    
    return result;
  };

  // ✅ ฟังก์ชันกรองข้อมูลตามช่วงเวลา
  const filterDetections = (detections: DetectionItem[]): DetectionItem[] => {
    if (!startTime || !endTime) {
      return detections;
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    const filtered = detections.filter((detection: DetectionItem) => {
      if (!detection.timestamp) return false;
      const detectionDate = new Date(detection.timestamp);
      return detectionDate >= startDate && detectionDate <= endDate;
    });

    // เรียงลำดับจากใหม่ไปเก่า
    filtered.sort((a: DetectionItem, b: DetectionItem) => {
      const dateA = new Date(a.timestamp || 0).getTime();
      const dateB = new Date(b.timestamp || 0).getTime();
      return dateB - dateA;
    });

    return filtered;
  };

  // ✅ ฟังก์ชันค้นหาข้อมูล
  const handleSearch = () => {
    if (!startTime || !endTime) {
      setErrorMsgOffence("⚠️ กรุณาเลือก Start Time และ End Time");
      setErrorMsgDefence("⚠️ กรุณาเลือก Start Time และ End Time");
      return;
    }

    setErrorMsgOffence(null);
    setErrorMsgDefence(null);
    setCurrentPageOffence(1);
    setCurrentPageDefence(1);

    // Filter ข้อมูลทั้งสองฝั่ง
    const filteredOffence = filterDetections(allOffenceDetections);
    const filteredDefence = filterDetections(allDefenceDetections);

    setFilteredOffenceDetections(filteredOffence);
    setFilteredDefenceDetections(filteredDefence);
  };

  // ✅ ดึงข้อมูล Offence เมื่อ component mount
  useEffect(() => {
    if (!offCamId || !offToken) return;

    const fetchDetections = async () => {
      setIsLoadingOffence(true);
      setErrorMsgOffence(null);
      try {
        const json = await fetchDetectionshistory(offCamId, offToken);
        const detections = json.data || [];
        
        // เรียงลำดับจากใหม่ไปเก่า
        detections.sort((a: DetectionItem, b: DetectionItem) => {
          const dateA = new Date(a.timestamp || 0).getTime();
          const dateB = new Date(b.timestamp || 0).getTime();
          return dateB - dateA;
        });

        setAllOffenceDetections(detections);
        setFilteredOffenceDetections(detections);
              } catch (err: any) {
        console.error("Fetch offence detections failed:", err);
        setErrorMsgOffence("ไม่สามารถโหลดข้อมูลการตรวจจับ Offence ได้");
      } finally {
        setIsLoadingOffence(false);
      }
    };

    fetchDetections();
  }, [offCamId, offToken]);

  // ✅ ดึงข้อมูล Defence เมื่อ component mount
  useEffect(() => {
    if (!defCamId || !defToken) return;

    const fetchDetections = async () => {
      setIsLoadingDefence(true);
      setErrorMsgDefence(null);
      try {
        const json = await fetchDetectionshistory(defCamId, defToken);
        const detections = json.data || [];
        
        // เรียงลำดับจากใหม่ไปเก่า
        detections.sort((a: DetectionItem, b: DetectionItem) => {
          const dateA = new Date(a.timestamp || 0).getTime();
          const dateB = new Date(b.timestamp || 0).getTime();
          return dateB - dateA;
        });

        setAllDefenceDetections(detections);
        setFilteredDefenceDetections(detections);
              } catch (err: any) {
        console.error("Fetch defence detections failed:", err);
        setErrorMsgDefence("ไม่สามารถโหลดข้อมูลการตรวจจับ Defence ได้");
      } finally {
        setIsLoadingDefence(false);
      }
    };

    fetchDetections();
  }, [defCamId, defToken]);

  // Reset to page 1 when detections change
  useEffect(() => {
    setCurrentPageOffence(1);
  }, [filteredOffenceDetections.length]);

  useEffect(() => {
    setCurrentPageDefence(1);
  }, [filteredDefenceDetections.length]);

  // ✅ Component สำหรับแสดงตาราง
  const renderTable = (
    title: string,
    detections: DetectionItem[],
    currentDetections: DetectionItem[],
    currentPage: number,
    totalPages: number,
    startIndex: number,
    endIndex: number,
    setCurrentPage: (page: number) => void,
    isLoading: boolean,
    errorMsg: string | null
  ) => (
    <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-sm font-semibold text-gray-700">
          {title} ({detections.length} รายการ)
        </h2>
        {isLoading && (
          <span className="text-xs text-gray-500">กำลังโหลด...</span>
        )}
      </div>

      {errorMsg ? (
        <div className="p-4 text-sm text-red-600">{errorMsg}</div>
      ) : detections.length === 0 ? (
        <div className="p-4 text-center text-gray-500 text-sm">
          ไม่มีข้อมูลการตรวจจับ
        </div>
      ) : (
        <>
          <table className="w-full text-sm text-gray-700">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">id</th>
                <th className="px-4 py-2 text-left font-medium">Count</th>
                <th className="px-4 py-2 text-left font-medium">Time</th>
                <th className="px-4 py-2 text-left font-medium">Image</th>
              </tr>
            </thead>
            <tbody>
              {currentDetections.map((d) => (
                <tr
                  key={d.id}
                  className="border-t border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-2">{d.id}</td>
                  <td className="px-4 py-2">{d.objects ? d.objects.length : 0}</td>
                  <td className="px-4 py-2">
                    {d.timestamp ? new Date(d.timestamp).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-2">
                    {d.image_path ? (
                      <a
                        href={`https://tesa-api.crma.dev${d.image_path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        เปิดภาพ
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                แสดง {startIndex + 1} - {Math.min(endIndex, detections.length)} จาก {detections.length} รายการ
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ก่อนหน้า
                </button>
                <div className="flex items-center gap-1">
                  {getPaginationPages(currentPage, totalPages).map((page, index) => {
                    if (page === "...") {
                      return (
                        <span
                          key={`ellipsis-${index}`}
                          className="px-3 py-1.5 text-sm font-medium text-gray-500"
                        >
                          ...
                        </span>
                      );
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page as number)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                          currentPage === page
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-2rem)] bg-white rounded-lg shadow p-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">History</h1>
        </div>

        {/* Search Form */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-4">ค้นหาประวัติการตรวจจับ</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-800">Start Time</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-800">End Time</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            onClick={handleSearch}
            className="w-full md:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            Search
          </button>
        </div>

        {/* ✅ Two Tables: Offence (Left) and Defence (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Offence Table */}
          <div>
            {renderTable(
              "Offence",
              filteredOffenceDetections,
              currentOffenceDetections,
              currentPageOffence,
              totalPagesOffence,
              startIndexOffence,
              endIndexOffence,
              setCurrentPageOffence,
              isLoadingOffence,
              errorMsgOffence
            )}
          </div>

          {/* Defence Table */}
          <div>
            {renderTable(
              "Defence",
              filteredDefenceDetections,
              currentDefenceDetections,
              currentPageDefence,
              totalPagesDefence,
              startIndexDefence,
              endIndexDefence,
              setCurrentPageDefence,
              isLoadingDefence,
              errorMsgDefence
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
