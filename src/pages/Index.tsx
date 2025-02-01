import React from "react";
import AppSidebar from "../components/AppSidebar";
import Button from "../components/Button";
import { Plus, Video } from "lucide-react";

const Index: React.FC = () => {
  return (
    <div className="min-h-screen flex">
      {/* Боковая панель */}
      <AppSidebar />

      {/* Основной контент */}
      <main className="flex-1 overflow-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Welcome to VideoChat</h1>
          {/* Если понадобится, можно добавить кнопку для открытия/закрытия боковой панели */}
        </div>

        <div className="grid gap-6">
          <section className="glass rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Quick Actions</h2>
              <Button variant="primary">
                <Plus className="h-4 w-4 mr-2" />
                Create Room
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((room) => (
                <div key={room} className="card-gradient rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Video className="h-5 w-5 text-blue-500" />
                    <h3 className="font-medium">Room {room}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">3 participants</p>
                  <Button variant="secondary" className="w-full">
                    Join Room
                  </Button>
                </div>
              ))}
            </div>
          </section>

          <section className="glass rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Online Friends</h2>
            <div className="grid gap-2">
              {["Alice", "Bob", "Charlie"].map((friend) => (
                <div
                  key={friend}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>{friend}</span>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Video className="h-4 w-4 mr-2" />
                    Call
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Index;