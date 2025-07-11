import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '../../../../lib/db';

export async function GET(req: NextRequest) {
  let connection;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute('SELECT id, name FROM players');
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json({ message: 'Error fetching players' }, { status: 500 });
  } finally {
    if (connection) connection.end();
  }
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  let connection;
  try {
    connection = await getConnection();
    const [result] = await connection.execute('INSERT INTO players (name) VALUES (?)', [name]);
    const newPlayerId = (result as any).insertId;
    return NextResponse.json({ id: newPlayerId, name }, { status: 201 });
  } catch (error) {
    console.error('Error adding player:', error);
    return NextResponse.json({ message: 'Error adding player' }, { status: 500 });
  } finally {
    if (connection) connection.end();
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ message: 'Player ID is required' }, { status: 400 });
  }

  let connection;
  try {
    connection = await getConnection();
    await connection.beginTransaction();

    // Delete associated sessions first
    await connection.execute('DELETE FROM sessions WHERE playerId = ?', [id]);

    // Then delete the player
    const [result] = await connection.execute('DELETE FROM players WHERE id = ?', [id]);

    if ((result as any).affectedRows === 0) {
      await connection.rollback();
      return NextResponse.json({ message: 'Player not found' }, { status: 404 });
    }

    await connection.commit();
    return NextResponse.json({ message: 'Player and associated sessions deleted' }, { status: 200 });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error deleting player:', error);
    return NextResponse.json({ message: 'Error deleting player' }, { status: 500 });
  } finally {
    if (connection) connection.end();
  }
}