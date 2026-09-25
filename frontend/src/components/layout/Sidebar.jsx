import { useLocation } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { useRef } from "react";
import {
  HardDriveIcon,
  Trash2Icon,
  UsersIcon,
  PlusIcon,
  FolderPlusIcon,
  UploadIcon,
} from "lucide-react";
import { Dropdown, DropdownItem } from "../ui/Dropdown";
import { ProgressBar } from "../ui/ProgressBar";

const Sidebar = ({
  onCreateFolderClick,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const { user } = useApp();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const storageUsed = Number(user?.storageUsed ?? 0);
  const storageLimit = Number(user?.storageLimit ?? 1073741824);

  const usePercentage = Math.min(
    100,
    Math.round((storageUsed / storageLimit) * 100)
  );

  const navItems = [
    {
      label: "My Drive",
      path: "/",
      icon: HardDriveIcon,
    },
    {
      label: "Shared Files",
      path: "/shared",
      icon: UsersIcon,
    },
    {
      label: "Trash",
      path: "/trash",
      icon: Trash2Icon,
    },
  ];

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50
          w-64
          bg-white
          border-r border-slate-200
          flex flex-col
          transition-transform duration-300
          md:translate-x-0
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="h-20 px-6 flex items-center border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="text-orange-500 font-bold text-3xl">
              A
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-wide text-slate-800">
                DRIVEA
              </h1>

              <p className="text-[9px] tracking-widest text-slate-400">
                CLOUD STORAGE
              </p>
            </div>
          </div>
        </div>

        {/* New Item */}
        <div className="px-4 pt-5">
          <Dropdown
            align="left"
            className="w-52"
            trigger={
              <button
                type="button"
                className="
                  w-full
                  flex items-center justify-center gap-2
                  px-4 py-2.5
                  rounded-md
                  bg-orange-500
                  hover:bg-orange-600
                  text-white
                  text-sm font-medium
                  transition-colors
                "
              >
                <PlusIcon size={17} />
                New Item
              </button>
            }
          >
            <DropdownItem icon={FolderPlusIcon} onClick={onCreateFolderClick}>
              New Folder
            </DropdownItem>
            <DropdownItem icon={UploadIcon} onClick={handleUploadClick}>
              Upload File
            </DropdownItem>
          </Dropdown>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
          />
        </div>

        {/* Navigation */}
        <nav className="mt-5 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;

            const isActive =
              location.pathname === item.path ==="/" ?location.pathname ==="/" || location.pathname.startsWith("/drive"): location.pathname === item.path;

            return (
              <button
                key={item.path}
                onClick={() => {
                  window.location.href = item.path;
                  setIsMobileOpen(false);
                }}
                className={`
                  w-full
                  flex items-center gap-3
                  px-3 py-2.5
                  mb-1
                  rounded-r-md
                  text-sm
                  transition-colors
                  ${
                    isActive
                      ? "bg-orange-50 text-orange-600 border-r-2 border-orange-500"
                      : "text-slate-600 hover:bg-slate-50"
                  }
                `}
              >
                <Icon size={17} strokeWidth={1.8} />

                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Storage */}
        <div className="mt-auto p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Storage
            </span>

            <span className="text-xs text-slate-400">
              {usePercentage}%
            </span>
          </div>

          <ProgressBar
            progress={usePercentage}
            className="bg-slate-100"
            color="bg-orange-500"
          />

          <p className="mt-2 text-xs text-slate-400">
            {formatBytes(storageUsed)} of {formatBytes(storageLimit)}
          </p>
        </div>
      </aside>
    </>
  );
};

const formatBytes = (bytes) => {
  if (!bytes) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.floor(
    Math.log(bytes) / Math.log(1024)
  );

  return `${(bytes / Math.pow(1024, index)).toFixed(
    index === 0 ? 0 : 1
  )} ${units[index]}`;
};

export default Sidebar;