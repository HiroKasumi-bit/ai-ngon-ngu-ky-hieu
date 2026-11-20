"""Dựng và render logo SignBridge AI bằng Blender Cycles cho trang giới thiệu.

Kiểu studio sản phẩm thật: cạnh vát nhỏ và sắc (không phồng), chất liệu satin mờ có vân rất nhỏ,
đèn softbox lớn, ánh sáng dội từ tường, một panel tròn xanh ngọc treo trên tường phía sau.

Chạy (không cần mở Blender):
  blender -b --factory-startup --python logo_scene.py -- still     # một khung, tư thế cuối
  blender -b --factory-startup --python logo_scene.py -- anim      # cả đoạn mở màn (khung 1..198)
  blender -b --factory-startup --python logo_scene.py -- portrait  # khung dọc cho điện thoại
Ảnh ra ở render/out/. Ghép thành video bằng ffmpeg (xem web/README.md).
"""
import math
import os
import re
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
MODE = ARGS[0] if ARGS else "still"
# Màu: AgX cho ánh sáng tự nhiên; tuỳ chọn để thử nhanh: -- still <view> <look> <exposure> <tên file>
VIEW = ARGS[1] if len(ARGS) > 1 else "Khronos PBR Neutral"  # giữ đúng màu thương hiệu, vẫn nén vùng sáng êm
LOOK = ARGS[2] if len(ARGS) > 2 else "None"
EXPOSURE = float(ARGS[3]) if len(ARGS) > 3 else 0.0
STILL_NAME = ARGS[4] if len(ARGS) > 4 else "still.png"
LIGHT = float(ARGS[5]) if len(ARGS) > 5 else 1.0

FPS = 30
INTRO_END = 150   # khung cuối của đoạn mở màn
LOOP = 48         # chu kỳ ba chấm "đang gõ" (1,6 giây); khung 151..198 lặp lại liền mạch

# Cùng đường nét với web/public/logo.svg (đơn vị: mm, trục y hướng xuống)
PATHS = {
    "HandL": "M96 214 C90 182 110 160 138 158 C152 158 160 170 154 184 C146 206 150 232 162 254 C188 304 222 328 246 332 L246 424 C172 420 114 360 96 214Z",
    "HandR": "M416 214 C422 182 402 160 374 158 C360 158 352 170 358 184 C366 206 362 232 350 254 C324 304 290 328 266 332 L266 424 C340 420 398 360 416 214Z",
    "Bubble": "M256 168 C298 168 330 196 330 234 C330 272 298 298 258 298 C246 298 236 296 228 292 L196 304 L208 278 C192 266 182 250 182 234 C182 196 214 168 256 168Z",
}
CENTER = (256, 291)
MM = 0.001


def srgb(hexcode, a=1.0):
    """Mã màu web -> màu tuyến tính cho Blender."""
    c = [int(hexcode[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c) + (a,)


# ---------- dựng cảnh ----------
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    try:
        s.render.engine = "CYCLES"
    except TypeError as e:
        print("engine:", e)
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "OPTIX"
    prefs.refresh_devices()
    for d in prefs.devices:
        d.use = d.type == "OPTIX"
    s.cycles.device = "GPU"
    s.cycles.samples = 128
    s.cycles.use_denoising = True
    s.cycles.denoiser = "OPTIX"
    s.render.fps = FPS
    s.render.use_motion_blur = True
    s.render.motion_blur_shutter = 0.45
    s.view_settings.view_transform = VIEW
    try:
        s.view_settings.look = LOOK
    except TypeError as e:  # danh sách tên hợp lệ nằm trong thông báo lỗi
        print("LOOK", e)
    s.view_settings.exposure = EXPOSURE
    return s


def material(name, hexcode, rough, spec=0.4, bump=0.0, sss=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = srgb(hexcode)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Specular IOR Level"].default_value = spec
    if sss:
        bsdf.inputs["Subsurface Weight"].default_value = sss
        bsdf.inputs["Subsurface Radius"].default_value = (0.004, 0.004, 0.004)
    if bump:  # vân rất nhỏ như sơn tĩnh điện: bề mặt thật không bao giờ phẳng tuyệt đối
        tex = nt.nodes.new("ShaderNodeTexNoise")
        tex.inputs["Scale"].default_value = 900
        tex.inputs["Detail"].default_value = 6
        b = nt.nodes.new("ShaderNodeBump")
        b.inputs["Strength"].default_value = bump
        b.inputs["Distance"].default_value = 0.0002
        nt.links.new(tex.outputs["Fac"], b.inputs["Height"])
        nt.links.new(b.outputs["Normal"], bsdf.inputs["Normal"])
    return m


def parse(d):
    """Đường SVG (M, C, L, Z, toạ độ tuyệt đối) -> danh sách điểm Bézier (co, handle trái, handle phải)."""
    tok = re.findall(r"[MCLZ]|-?\d+\.?\d*", d)
    pts, i, cmd = [], 0, None
    P = lambda x, y: Vector(((x - CENTER[0]) * MM, -(y - CENTER[1]) * MM, 0))
    while i < len(tok):
        if tok[i] in "MCLZ":
            cmd = tok[i]; i += 1
            if cmd == "Z":
                continue
        if cmd == "M":
            pts.append([P(float(tok[i]), float(tok[i + 1])), None, None]); i += 2
        elif cmd == "C":
            c1, c2, p = (P(float(tok[i + k]), float(tok[i + k + 1])) for k in (0, 2, 4)); i += 6
            pts[-1][2] = c1
            pts.append([p, c2, None])
        elif cmd == "L":
            p = P(float(tok[i]), float(tok[i + 1])); i += 2
            a = pts[-1][0]
            pts[-1][2] = a + (p - a) / 3
            pts.append([p, p - (p - a) / 3, None])
    if (pts[-1][0] - pts[0][0]).length < 1e-6:  # điểm cuối trùng điểm đầu: gộp lại, đóng vòng
        pts[0][1] = pts[-1][1]
        pts.pop()
    for k, (co, hl, hr) in enumerate(pts):  # handle còn trống: thẳng về điểm kề
        if hl is None:
            prev = pts[k - 1][0]; pts[k][1] = co + (prev - co) / 3
        if hr is None:
            nxt = pts[(k + 1) % len(pts)][0]; pts[k][2] = co + (nxt - co) / 3
    return pts


def extruded(name, d, depth, bevel, mat, z=0.0):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "2D"
    cu.fill_mode = "BOTH"
    cu.extrude = depth / 2
    cu.bevel_depth = bevel        # vát nhỏ: cạnh sắc bắt sáng thành một đường mảnh
    cu.bevel_resolution = 6
    cu.resolution_u = 32
    sp = cu.splines.new("BEZIER")
    pts = parse(d)
    sp.bezier_points.add(len(pts) - 1)
    for bp, (co, hl, hr) in zip(sp.bezier_points, pts):
        bp.handle_left_type = bp.handle_right_type = "FREE"
        bp.co, bp.handle_left, bp.handle_right = co, hl, hr
    sp.use_cyclic_u = True
    ob = bpy.data.objects.new(name, cu)
    ob.data.materials.append(mat)
    bpy.context.collection.objects.link(ob)
    # đặt tâm xoay vào giữa chính phần đó (để lắp ráp)
    pts_c = sum((p[0] for p in pts), Vector()) / len(pts)
    for bp in sp.bezier_points:
        bp.co -= pts_c; bp.handle_left -= pts_c; bp.handle_right -= pts_c
    ob.location = pts_c + Vector((0, 0, z))
    return ob


def build():
    s = reset()
    teal = material("Teal", "#1FB3A6", 0.42, spec=0.35, bump=0.04, sss=0.04)
    sun = material("Sun", "#FFC431", 0.40, spec=0.35, bump=0.04, sss=0.05)
    navy = material("Navy", "#18265A", 0.34, spec=0.4)
    wall_m = material("Wall", "#EEF6F5", 0.9, spec=0.2)
    panel_m = material("Panel", "#13958A", 0.85, spec=0.2, bump=0.02)  # sẫm và mờ hơn logo để tách khối

    logo = bpy.data.objects.new("Logo", None)
    bpy.context.collection.objects.link(logo)
    hl = extruded("HandL", PATHS["HandL"], 0.030, 0.0016, teal)
    hr = extruded("HandR", PATHS["HandR"], 0.030, 0.0016, teal)
    bub = extruded("Bubble", PATHS["Bubble"], 0.020, 0.0016, sun, z=0.024)
    for ob in (hl, hr, bub):
        ob.parent = logo
    dots = []
    for k, x in enumerate((228, 256, 284)):
        bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=9.5 * MM, depth=0.006)
        dot = bpy.context.active_object
        dot.name = f"Dot{k}"
        bev = dot.modifiers.new("Bevel", "BEVEL"); bev.width = 0.0018; bev.segments = 5
        bpy.ops.object.shade_smooth()
        dot.data.materials.append(navy)
        dot.parent = bub
        dot.location = Vector(((x - CENTER[0]) * MM, -(234 - CENTER[1]) * MM, 0)) - (bub.location - Vector((0, 0, bub.location.z))) + Vector((0, 0, 0.0115))
        dots.append(dot)

    # dựng đứng logo (mặt trước hướng về camera ở phía -Y), nghiêng 3/4 nhẹ
    logo.rotation_euler = (math.radians(90 + 5), 0, math.radians(-20))
    logo.location = (0, 0, 0)

    # tường phía sau + panel tròn xanh ngọc treo trên tường
    bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0.16, 0), rotation=(math.radians(90), 0, 0))
    bpy.context.active_object.data.materials.append(wall_m)
    bpy.ops.mesh.primitive_cylinder_add(vertices=256, radius=0.40, depth=0.02, location=(0.12, 0.14, -0.30), rotation=(math.radians(90), 0, 0))
    panel = bpy.context.active_object
    pb = panel.modifiers.new("Bevel", "BEVEL"); pb.width = 0.003; pb.segments = 4
    bpy.ops.object.shade_smooth()
    panel.data.materials.append(panel_m)

    # đèn: softbox chính trên-trái, đèn phụ dịu bên phải, đèn viền phía sau
    def area(name, loc, power, size, color=(1, 1, 1)):
        L = bpy.data.lights.new(name, "AREA")
        L.energy, L.size, L.color = power, size, color
        L.shape = "DISK"
        ob = bpy.data.objects.new(name, L)
        bpy.context.collection.objects.link(ob)
        ob.location = loc
        d = Vector((0, 0, 0)) - Vector(loc)
        ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        return ob
    area("Key", (-1.1, -1.3, 1.1), 70 * LIGHT, 1.4, (1.0, 0.97, 0.93))   # hơi ấm, như ánh cửa sổ
    area("Fill", (1.6, -1.0, 0.1), 16 * LIGHT, 2.0, (0.9, 0.96, 1.0))    # hơi lạnh, chỉ để mặt tối không đen
    area("Rim", (0.9, 0.5, 0.8), 20 * LIGHT, 0.5)                      # tách viền logo khỏi tường
    w = bpy.data.worlds.new("World")
    s.world = w
    w.use_nodes = True
    bg = next(n for n in w.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs["Color"].default_value = srgb("#E8F1F0")
    bg.inputs["Strength"].default_value = 0.18 * LIGHT

    cam_data = bpy.data.cameras.new("Cam")
    cam_data.lens = 85
    cam_data.dof.use_dof = True
    cam_data.dof.aperture_fstop = 4.0
    cam_data.dof.focus_object = logo  # lấy nét vào logo, tường phía sau hơi mềm
    cam = bpy.data.objects.new("Cam", cam_data)
    bpy.context.collection.objects.link(cam)
    cam.rotation_euler = (math.radians(90), 0, 0)
    s.camera = cam
    return s, logo, hl, hr, bub, dots, cam


# ---------- chuyển động ----------
def key(ob, path, frame, value, interp="BEZIER", easing="AUTO"):
    setattr(ob, path, value) if not isinstance(value, tuple) else None
    if isinstance(value, tuple):
        getattr(ob, path)[:] = value
    ob.keyframe_insert(path, frame=frame)
    fc = ob.animation_data.action
    for fcu in fcurves(ob):
        if fcu.data_path == path:
            for kp in fcu.keyframe_points:
                if int(round(kp.co.x)) == frame:
                    kp.interpolation, kp.easing = interp, easing


def fcurves(ob):
    act = ob.animation_data.action
    if hasattr(act, "fcurves"):
        return act.fcurves
    # Blender 5: hành động theo lớp (layers -> strips -> channelbags)
    out = []
    for layer in act.layers:
        for strip in layer.strips:
            for cb in strip.channelbags:
                out.extend(cb.fcurves)
    return out


def animate(s, logo, hl, hr, bub, dots, cam, end_frame):
    s.frame_start, s.frame_end = 1, end_frame
    # 1) hai bàn tay trượt vào từ hai bên, xoay về đúng chỗ
    for ob, side, t0 in ((hl, -1, 4), (hr, 1, 8)):
        rest_loc, rest_rot = tuple(ob.location), tuple(ob.rotation_euler)
        key(ob, "location", t0, (rest_loc[0] + side * 0.42, rest_loc[1] - 0.10, rest_loc[2] - 0.05))
        key(ob, "rotation_euler", t0, (0, side * math.radians(-75), side * math.radians(25)))
        key(ob, "location", t0 + 40, rest_loc, "EXPO", "EASE_OUT")
        key(ob, "rotation_euler", t0 + 40, rest_rot, "EXPO", "EASE_OUT")
        # sửa nội suy: khung đầu mới quyết định đoạn chuyển động
        for fcu in fcurves(ob):
            for kp in fcu.keyframe_points:
                if int(round(kp.co.x)) == t0:
                    kp.interpolation, kp.easing = "EXPO", "EASE_OUT"
    # 2) bong bóng bật lên (vượt nhẹ rồi về)
    rest = tuple(bub.location)
    key(bub, "scale", 30, (0.001, 0.001, 0.001), "BACK", "EASE_OUT")
    key(bub, "location", 30, (rest[0], rest[1] - 0.06, rest[2]), "BACK", "EASE_OUT")
    key(bub, "scale", 58, (1, 1, 1))
    key(bub, "location", 58, rest)
    # 3) ba chấm bật ra lần lượt, rồi nhấp nhô như đang gõ (lặp, chu kỳ LOOP khung)
    for k, d in enumerate(dots):
        f0 = 50 + k * 4
        key(d, "scale", f0, (0.001, 0.001, 0.001), "BACK", "EASE_OUT")
        key(d, "scale", f0 + 12, (1, 1, 1))
        base = tuple(d.location)
        start = 66 + k * 6
        f = start
        while f < end_frame + LOOP:
            key(d, "location", f, base, "SINE", "EASE_IN_OUT")
            key(d, "location", f + 8, (base[0], base[1] + 0.005, base[2]), "SINE", "EASE_IN_OUT")
            key(d, "location", f + 16, base, "SINE", "EASE_IN_OUT")
            f += LOOP
    # 4) camera: cận cảnh giữa khung -> lùi ra, logo trôi về bên phải bố cục
    cam.data.shift_x, cam.data.shift_y = 0.0, 0.0
    cam.location = (0, -1.55, 0.0)
    cam.keyframe_insert("location", frame=1)
    cam.data.keyframe_insert("shift_x", frame=1)
    cam.data.keyframe_insert("shift_y", frame=1)
    cam.location = (0, -1.55, 0.0)
    cam.keyframe_insert("location", frame=62)
    cam.data.keyframe_insert("shift_x", frame=62)
    cam.data.keyframe_insert("shift_y", frame=62)
    final_cam(cam)
    cam.keyframe_insert("location", frame=122)
    cam.data.keyframe_insert("shift_x", frame=122)
    cam.data.keyframe_insert("shift_y", frame=122)
    for holder in (cam, cam.data):
        for fcu in fcurves(holder):
            for kp in fcu.keyframe_points:
                if int(round(kp.co.x)) == 62:
                    kp.interpolation, kp.easing = "EXPO", "EASE_IN_OUT"


def final_cam(cam):
    """Bố cục cuối: logo ở khoảng 72% bề ngang, hơi trên giữa (chừa chỗ bên trái cho chữ)."""
    cam.location = (0, -2.35, 0.0)
    cam.data.shift_x = -0.22
    cam.data.shift_y = 0.01


def render(s, path, frames=None, res=(1920, 1080)):
    s.render.resolution_x, s.render.resolution_y = res
    s.render.resolution_percentage = 100
    s.render.image_settings.file_format = "PNG"
    s.render.image_settings.color_mode = "RGB"
    os.makedirs(OUT, exist_ok=True)
    s.render.filepath = os.path.join(OUT, path)
    if frames is None:
        bpy.ops.render.render(write_still=True)
    else:
        s.frame_start, s.frame_end = frames
        bpy.ops.render.render(animation=True)


if __name__ == "__main__":
    s, logo, hl, hr, bub, dots, cam = build()
    if MODE == "still":
        final_cam(cam)
        render(s, STILL_NAME, res=(960, 540))
    elif MODE == "portrait":
        cam.location = (0, -1.9, -0.03)
        cam.data.shift_x, cam.data.shift_y = 0, 0.0
        render(s, "portrait.png", res=(1080, 1350))
    elif MODE == "test":  # vài khung nhỏ để soát chuyển động trước khi render thật
        animate(s, logo, hl, hr, bub, dots, cam, INTRO_END + LOOP)
        s.cycles.samples = 32
        for f in (6, 20, 34, 44, 56, 80, 100, 122, 160):
            s.frame_set(f)
            render(s, f"test_{f:03d}.png", res=(640, 360))
    elif MODE == "anim":
        animate(s, logo, hl, hr, bub, dots, cam, INTRO_END + LOOP)
        s.cycles.samples = 96
        s.render.use_persistent_data = True  # giữ dữ liệu cảnh giữa các khung cho nhanh
        s.render.use_overwrite = False       # chạy lại thì bỏ qua khung đã render xong
        render(s, "frames/f_", frames=(1, INTRO_END + LOOP))
    print("DONE", MODE)
