import { Disclaimer } from "../components/Disclaimer";

export function AboutPage() {
  return (
    <section className="about" aria-label="Giới thiệu đề tài">
      <h2>Giới thiệu đề tài</h2>
      <p>
        Ứng dụng local phát hiện lá cà chua khỏe hoặc bệnh từ ảnh PlantDoc. Bounding box mô tả lá
        hoặc cụm lá, không khoanh từng đốm bệnh.
      </p>
      <p>
        Mô hình YOLO11s được fine-tune trên 9 lớp cà chua của PlantDoc, xuất sang ONNX và chạy bằng
        ONNX Runtime trên CPU; frontend React chỉ gửi ảnh/khung hình lên FastAPI cục bộ, không đưa ảnh
        ra ngoài máy.
      </p>
      <Disclaimer />
    </section>
  );
}
